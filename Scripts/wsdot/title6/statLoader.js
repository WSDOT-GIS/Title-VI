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
		constructor: function (url) {
			//  Query to get feature IDs.
			var self = this, query, queryTask;

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
					queryTask.execute(query);
				}

				// Break object IDs into groups of 1000 or fewer.

				for (i = 0, l = objectIds.length; i < objectIds.length; i++) {
					if (i % 1000 === 0) {
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