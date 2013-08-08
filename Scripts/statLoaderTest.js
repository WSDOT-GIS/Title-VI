/*global require*/
require(["esri/config", "title6/statLoader"], function (config, StatLoader) {
	"use strict";
	var statLoader, featureSet, textArea;

	textArea = document.getElementById("output");

	config.defaults.io.proxyUrl = "proxy.ashx";

	statLoader = new StatLoader("http://hqolymgis99t/arcgis/rest/services/Demographic/Language/MapServer/1");
	statLoader.on("query-object-ids-complete", function (objectIds) {
		console.log("Object IDs query complete", objectIds);
	});

	statLoader.on("query-object-ids-error", function (error) {
		console.error("Object IDs query error", error);
	});

	statLoader.on("query-group-complete", function (featureSet) {
		console.log("query group complete", featureSet);
	});

	statLoader.on("query-error", function (error) {
		console.error("query-error", error);
	});

	statLoader.on("all-queries-complete", function (results) {
		if (results.errorCount) {
			console.log(["Queries completed with", results.errorCount, "errors"].join(" "));
		} else {
			console.log("All queries completed");
		}
		textArea.value += JSON.stringify(results.featureSet);
	});
});