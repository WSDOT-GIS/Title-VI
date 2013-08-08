/*global require*/
/*jslint browser:true*/
require(["esri/config", "title6/statLoader"], function (config, StatLoader) {
	"use strict";
	var statLoader, textArea;

	/** Gets the URL specified by the "url" query string parameter, or null if there is no such parameter.
	@returns {String|null}
	*/
	function getUrlQSParameter() {
		var urlRe, match, output = null;
		if (document.location.search.length) {
			urlRe = /url=([^\&]+)/gi;
			match = document.location.search.match(urlRe);
			if (match) {
				output = match[1];
				console.log("match found", output);
			}
		}
		return output;
	}

	textArea = document.getElementById("output");

	config.defaults.io.proxyUrl = "proxy.ashx";

	statLoader = new StatLoader(getUrlQSParameter() || "http://hqolymgis99t/arcgis/rest/services/Demographic/Language/MapServer/1");
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