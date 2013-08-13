/*global require*/
/*jslint browser:true*/
require(["esri/config", "title6/statLoader"], function (config, StatLoader) {
	"use strict";
	var statLoader, url;

	/** Gets a query string parameter.
	@returns {String|null} Returns the value of the query string parameter, or null if that parameter is not defined.
	*/
	function getQueryStringParameter(/** {String} */ key) {
		var keyRe, match, output = null, decoded;
		if (document.location.search.length) {
			keyRe = new RegExp(key + "=([^\\&]+)", "i");
			match = document.location.search.match(keyRe);
			if (match) {
				output = match[1];
				// Decode the component
				decoded = decodeURIComponent(output);
				// If it actually needed decoding, replace the plusses with %20 and re-decode.
				// The plusses are not replaced with spaces as you might expect and cause problems
				// with the where clause.
				if (output !== decoded) {
					output = output.replace(/\+/g, "%20");
					output = decodeURIComponent(output);
				}
				console.log(key, output);
			}
		}
		return output;
	}

	/** Adds a message to the list on the page.
	 * @param {String} message
	 * @param {String|Array} [messageClass]
	 */
	function addMessage(message, messageClass) {
		var li, messageList;
		messageList = document.getElementById("messages");
		li = document.createElement("li");
		li.textContent = message;
		if (messageClass) {
			if (typeof messageClass === "string") {
				li.setAttribute("class", messageClass);
			} else if (messageClass instanceof Array) {
				li.setAttribute("class", messageClass.join(" "));
			}
		}
		messageList.appendChild(li);
	}

	/** Updates the progress bar.
	 * @param {Object} queryGroupCompleteResult
	 * @param {Object} queryGroupCompleteResult.featureSet
	 * @param {Number} queryGroupCompleteResult.totalGroups
	 * @param {Number} queryGroupCompleteResult.groupsCompleted
	 * @param {Number} queryGroupCompleteResult.groupsErrored
	 */
	function updateProgressBar(queryGroupCompleteResult) {
		var prog, currentValue = queryGroupCompleteResult.groupsCompleted + queryGroupCompleteResult.groupsErrored;
		prog = document.getElementById("progressBar");

		prog.max = queryGroupCompleteResult.totalGroups;
		prog.value = currentValue;
	}

	function hideProgressBar() {
		document.getElementById("progressBar").hidden = true;
	}

	function saveFeatureSet(/**{FeatureSet}*/ featureSet) {
		var json, pre;
		json = featureSet.toJson();
		json = JSON.stringify(json);
		// TODO: Check for support of file system API support to save file. Use if supported by browser. See http://www.html5rocks.com/en/tutorials/file/filesystem/

		document.getElementById("dataInput").value = json;
		document.getElementById("textHandlerForm").submit();
	}

	config.defaults.io.proxyUrl = "proxy.ashx";

	url = getQueryStringParameter("url");
	if (url) {
		statLoader = new StatLoader(url, {
			where: getQueryStringParameter("where")
		});
		statLoader.on("query-object-ids-complete", function (objectIds) {
			// console.log("Object IDs query complete", objectIds);
			addMessage("Object IDs query complete.");
		});

		statLoader.on("query-object-ids-error", function (error) {
			//console.error("Object IDs query error", error);
			addMessage("Object IDs query error" + "\n" + JSON.stringify(error), "error");
			hideProgressBar();
		});

		statLoader.on("query-group-complete", function (featureSet) {
			updateProgressBar(featureSet);
			addMessage("Query group complete");
		});

		statLoader.on("query-error", function (error) {
			//console.error("query-error", error);
			addMessage("Query error" + "\n" + JSON.stringify(error), "error");
		});

		statLoader.on("all-queries-complete", function (results) {
			var progress, featureSet = results.featureSet;
			if (results.errorCount) {
				//console.log(["Queries completed with", results.errorCount, "errors"].join(" "));
				addMessage(["Queries completed with", results.errorCount, "errors"].join(" "), "error");
			} else {
				addMessage("All queries completed.");
			}

			saveFeatureSet(featureSet);

			progress = document.getElementsByTagName("progress")[0];
			if (progress) {
				progress.parentNode.removeChild(progress);
			}
		});
	} else {
		hideProgressBar();
	}
});