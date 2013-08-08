/*global define*/
/*jslint white:true,plusplus:true*/
define([
	"dojo/_base/declare",
	"dojo/Evented",
	"esri/tasks/query",
	"esri/tasks/QueryTask"
], function (declare, Evented, Query, QueryTask) {
	"use strict";
	var StatLoader;

	/** Combines an array of feature sets with the same schema into a single feature set.
	Note that the schema is not verified before combining.
	@return {FeatureSet}
	*/
	function combineFeatureSets(/** {FeatureSet[]}*/ featureSets) {
		var i, l, currentFeatureSet, output;
		for (i = 0, l = featureSets.length; i < l; i += 1) {
			currentFeatureSet = featureSets[i];
			if (!output && currentFeatureSet && currentFeatureSet.features.length) {
				output = currentFeatureSet;
			} else {
				if (currentFeatureSet.features && currentFeatureSet.features.length) {
					output.features = output.features.concat(currentFeatureSet.features);
				}
			}
		}
		return output;
	}

	StatLoader = declare([Evented], {
		feautureSet: null,
		/**
		@param {String} url The URL to a map service layer. (E.g., http://www.example.com/arcgis/rest/services/Demographic/Language/MapServer/1)
		@param {Object} options
		@param {Number} options.threshold
		@param {String} options.where The where clause to use with the query. Defaults to 1=1 if omitted.
		*/
		constructor: function (url, options) {
			//  Query to get feature IDs.
			var self = this, query, queryTask, totalGroups, groupsCompleted = 0, groupsErrored = 0, featureSets = [];



			/** Checks to see if the queries for all object id groups have completed.
			*/
			function checkForCompleted() {
				var combinedFeatureSet;
				if (groupsCompleted + groupsErrored === totalGroups) {
					combinedFeatureSet = combineFeatureSets(featureSets);
					self.feautureSet = combinedFeatureSet;
					self.emit("all-queries-complete", {
						featureSet: combinedFeatureSet,
						errorCount: groupsErrored
					});
				}

			}

			// Create the options object if it does not already exist.
			if (!options) {
				options = {};
			}

			// Set up defaults.
			if (!options.threshold) {
				options.threshold = 1000;
			}
			
			query = new Query();
			query.where = options.where || "1=1";

			queryTask = new QueryTask(url);
			queryTask.executeForIds(query, function (/**{Number[]}*/ objectIds) {
				var i, l, idGroups = [], currentGroup;


				self.emit("query-object-ids-complete", objectIds);

				function onQueryError(error) {
					groupsErrored++;
					self.emit("query-error", error);
					checkForCompleted();
				}

				function onQueryComplete(featureSet) {
					var output;
					groupsCompleted++;
					featureSets.push(featureSet);
					output = {
						featureSet: featureSet,
						totalGroups: totalGroups,
						groupsCompleted: groupsCompleted,
						groupsErrored: groupsErrored
					};
					self.emit("query-group-complete", output);
					checkForCompleted();
				}

				function submitQuery(objectIds) {
					query.objectIds = objectIds;
					query.returnGeometry = true;
					query.outFields = ["*"];
					queryTask.execute(query, onQueryComplete, onQueryError);
				}

				// Break object IDs into groups of 1000 or fewer.

				for (i = 0, l = objectIds.length; i < objectIds.length; i++) {
					if (i % options.threshold === 0) {
						currentGroup = [objectIds[i]];
						idGroups.push(currentGroup);
					} else {
						currentGroup.push(objectIds[i]);
					}
				}

				// Store the total number of object id groups.
				totalGroups = idGroups.length;

				for (i = 0, l = idGroups.length; i < l; i += 1) {
					currentGroup = idGroups[i];
					submitQuery(objectIds);
				}

			}, function (/**{Error}*/ error) {
				self.emit("query-object-ids-error", error);
			});
		}
	});

	return StatLoader;
});