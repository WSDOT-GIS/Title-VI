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

	StatLoader = declare([Evented], {
		/**
		@param {String} url The URL to a map service layer. (E.g., http://www.example.com/arcgis/rest/services/Demographic/Language/MapServer/1)
		*/
		constructor: function (url, options) {
			//  Query to get feature IDs.
			var self = this, query, queryTask;

			// Create the options object if it does not already exist.
			if (!options) {
				options = {};
			}

			if (!options.threshold) {
				options.threshold = 1000;
			}
			

			query = new Query();
			query.where = "1=1";

			queryTask = new QueryTask(url);
			queryTask.on("complete", function (featureSet) {
				self.emit("query-group-complete", featureSet);
			});
			queryTask.on("error", function (error) {
				self.emit("query-error", error);
			});

			queryTask.executeForIds(query, function (/**{Number[]}*/ objectIds) {
				var i, l, idGroups = [], currentGroup;

				self.emit("query-object-ids-complete", objectIds);

				function submitQuery(objectIds) {
					query.objectIds = objectIds;
					query.returnGeometry = true;
					query.outFields = ["*"];
					queryTask.execute(query);
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