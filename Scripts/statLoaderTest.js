/*global require*/
require(["title6/statLoader"], function (StatLoader) {
	"use strict";
	var statLoader;

	statLoader = new StatLoader("http://hqolymgis99t/arcgis/rest/services/Demographic/Language/MapServer/1");
	statLoader.on("query-object-ids-complete", function (objectIds) {
		console.log(objectIds);
	});

	statLoader.on("query-object-ids-error", function (error) {
		console.error(error);
	});

	statLoader.on("query-group-complete", function (featureSet) {
		console.debug(featureSet);
	});
});