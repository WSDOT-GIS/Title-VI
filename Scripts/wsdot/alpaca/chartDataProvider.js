/*global define*/
/*jslint nomen:true,plusplus:true*/

/* Required JavaScript features
Array.prototype.map
*/

define([
	"dojo/_base/declare",
	"dojo/Deferred",
	"dojo/Evented",
	"esri/config",
	"esri/graphic",
	"esri/tasks/query",
	"esri/tasks/QueryTask",
	"esri/tasks/StatisticDefinition",
	"esri/tasks/RelationParameters",
	"./raceData",
	"./languageData",
	"./ageData",
	"./veteranData",
	"./povertyData",
	"./utils",
	"dojo/text!alpaca/aggregate_fields.txt"
], function (
	declare, Deferred, Evented, esriConfig, Graphic, Query, QueryTask, StatisticDefinition, RelationParameters,
	RaceData, LanguageData, AgeData, VeteranData, PovertyData, utils, fields)
{
	/** Provides classes for updating charts.
	 * @exports wsdot/alpaca/chartDataProvider
	 */
	"use strict";
	var ChartDataProvider, marginOfErrorRe, raceFieldRe, popFieldRe, povFieldRe, langFieldRe, numberTypesRe;

	/** Determines if any of the values in an array match a given value.
	 * @returns {boolean}
	 */
	function arrayContainsValue(/**{Array}*/ a, v) {
		var output = false, i, l;

		for (i = 0, l = a.length; i < l; i += 1) {
			if (a[i] === v) {
				output = true;
				break;
			}
		}

		return output;
	}

	// These regular expressions detect the charts
	marginOfErrorRe = /^ME/;
	langFieldRe = /^(?:Total(?:(?:English)|(?:Spanish)|(?:IndoEuropean)|(?:AsianPacificIsland)|(?:Other)))$/i;
	popFieldRe = /^[MF]_([0-9]{1,2})?([a-z]+)?[0-9]+$/i;
	// vetFieldRe = /^[MF](Age[0-9]{1,2})?([a-z]+)?[0-9]+(?:Non)?Vet$/i;
	povFieldRe = /^((?:Total_POV)|(?:Poverty_(?:Fed)|(?:State))|(?:PctPoverty)|(?:Income))$/i;
	raceFieldRe = /^(?:(?:(?:Not)?White)|(?:AfricanAmerican_Black)|(?:AmericanIndian_AlaskaNative)|(?:AsianAlone)|(?:NativeHawaiian_PacificIsl)|(?:SomeOtherRace)|(?:TwoOrMoreRaces))$/i;
	numberTypesRe = /(?:Integer)|(?:Double})/i;


	/** Represents a field.
	 * @constructor
	 */
	function Field(v) {
		this.alias = v.alias || null;
		this.domain = v.domain || null;
		this.editable = v.editable || false;
		this.length = v.length || null;
		this.name = v.name || null;
		this.type = v.type || null;
	}

	/** Generate a statistic definition
	 * @param {string} [statisticType] Specify a statistic type. Defaults to "sum" if omitted.
	 * @param {string} [outStatisticFieldName]
	 * @returns {esri/tasks/StatisticDefinition}
	 */
	Field.prototype.toStatisticDefinition = function (statisticType, outStatisticFieldName) {
		var statDef;
		statDef = new StatisticDefinition();
		statDef.onStatisticField = this.name;
		statDef.statisticType = statisticType || "sum";
		statDef.outStatisticFieldName = outStatisticFieldName || this.name;
		return statDef;
	};

	/** Used by JSON.parse to create esri/layers/Field objects.
	 */
	function parseField(k, v) {
		var output;
		if (v && v.name && v.type) {
			output = new Field(v);
		} else {
			output = v;
		}
		return output;
	}


	function FieldGroups(/**{Field[]}*/ fields) {
		var i, l, field;
		this.language = [];
		this.population = [];
		this.veteran = [];
		this.poverty = [];
		this.race = [];
		this.other = [];

		for (i = 0, l = fields.length; i < l; i += 1) {
			field = fields[i];
			if (field && field.name && !marginOfErrorRe.test(field.name) && numberTypesRe.test(field.type)) {
				if (langFieldRe.test(field.name)) {
					this.language.push(field);
				} else if (popFieldRe.test(field.name)) {
					this.population.push(field);
				} else if (VeteranData.fieldRegExp.test(field.name)) {
					this.veteran.push(field);
				} else if (povFieldRe.test(field.name)) {
					this.poverty.push(field);
				} else if (raceFieldRe.test(field.name)) {
					this.race.push(field);
				} else {
					this.other.push(field);
				}
			} else {
				this.other.push(field);
			}
		}
	}


	/** Creates an array of statistic definitions.
	 * @returns {StatisticDefinition[]}
	 */
	FieldGroups.prototype.toStatisticDefinitions = function () {
		var output = [];

		function toSD(value /*, index, traversedObject*/) {
			return value.toStatisticDefinition();
		}

		output = output.concat(this.language.map(toSD));
		output = output.concat(this.population.map(toSD));
		output = output.concat(this.veteran.map(toSD));
		output = output.concat(this.poverty.map(toSD));
		output = output.concat(this.race.map(toSD));

		return output;
	};

	FieldGroups.prototype.getOutFields = function () {
		var output = [];

		function getName(value) {
			return value.name;
		}

		output = output.concat(this.language.map(getName));
		output = output.concat(this.population.map(getName));
		output = output.concat(this.veteran.map(getName));
		output = output.concat(this.poverty.map(getName));
		output = output.concat(this.race.map(getName));

		return output;
	};

	// Fields is a string containing JSON: An array of field objects. Parse to actual Field objects.
	fields = JSON.parse(fields, parseField);
	fields = new FieldGroups(fields);

	/**
	 * @constructor
	 */
	function ChartData(/**{Object}*/ queryResults) {
		/** Provices race data */
		this.race = queryResults.race ? new RaceData(queryResults.race) : new RaceData(queryResults);
		/** Provides language data */
		this.language = queryResults.language ? new LanguageData(queryResults.language) : new LanguageData(queryResults);

		this.age = queryResults.age ? new AgeData(queryResults.age) : new AgeData(queryResults);

		this.veteran = queryResults.veteran ? new VeteranData(queryResults.age) : new VeteranData(queryResults);

		this.poverty = queryResults.poverty ? new PovertyData(queryResults.poverty) : new PovertyData(queryResults);
	}

	/**
	 * @param {string} type Choices are "statewide", "service area" or "selection"
	 * @param {esri/Graphic[]} features An array of graphics.
	 * @param {(ChartData|Object.<string, number>)} chartData Either a {@link ChartData} or the parameter to be passed to the {@link ChartData} constructor.
	 * @constructor
	 */
	function ChartDataQueryResult(type, features, chartData, originalGeometry) {
		this.type = type || null;
		this.features = features || null;
		this.chartData = (chartData instanceof ChartData) ? chartData : new ChartData(chartData);
		this.originalGeometry = originalGeometry || null;
	}

	/** Get the totals of each attribute of each of the featureSet's features.
	 * @param {(esri/tasks/FeatureSet|esri/Graphic[])} featureSet - Either a FeatureSet or an array of Graphics.
	 * @returns {ChartData}
	 */
	function getTotals(featureSet) {
		// Initiate count totals.
		var totals = {}, i, l, graphic, attrName, features;

		// Determine if input parameter is a FeatureSet or an array of graphics...
		if (featureSet.features) {
			features = featureSet.features;
		} else {
			features = featureSet;
		}

		for (i = 0, l = features.length; i < l; i += 1) {
			graphic = features[i];
			// Add the values from the attributes to the totals
			for (attrName in graphic.attributes) {
				if (graphic.attributes.hasOwnProperty(attrName)) {
					if (!totals[attrName]) {
						totals[attrName] = graphic.attributes[attrName];
					} else {
						totals[attrName] += graphic.attributes[attrName];
					}
				}
			}
		}

		totals = new ChartData(totals);

		return totals;
	}

	/** Returns the geometry property of a Graphic. Intended for use with Array.map function.
	 * @returns {Geometry}
	 */
	function getGeometryFromGraphic(/**{Graphic}*/ feature) {
		return feature.geometry;
	}

	/** An object used to provide chart data.
	 * @fires ChartDataProvider#totals-determined Fired when the data for the charts has been calculated.
	 * @fires ChartDataProvider#query-complete Occurs when a query has been completed.
	 * @fires ChartDataProvider#error
	 */
	ChartDataProvider = declare(Evented, {

		_statisticDefinitions: fields.toStatisticDefinitions(),
		/** The query tasks for each zoom level: blockGroup, tract, and county. */
		queryTasks: {
			blockGroup: null,
			tract: null,
			county: null
		},
		/** Returns a query task appropriate for the scale: county, tract, or block group.
		 * @param {number} scale
		 * @returns {esri/tasks/QueryTask}
		 */
		getQueryTaskForScale: function (scale) {
			var qt, levelName;
			levelName = utils.getLevel(scale);
			qt = this.queryTasks[levelName];
			return qt;
		},

		/** Determines a service area based on a given geometry and scale.
		 * @param {esri/Geometry} [drawnGeometry] The geometry used to determine the service area or selection. Not required for statewide.
		 * @param {Number} [scale] The scale of the map. Used to determine which query task is used (County, Tract, or Block Group). Not required for statewide.
		 * @param {Boolean} [union] Set to true to union the returned geometry. (Output will be a single graphic in this case.) Set to false to skip the union operation (for selection).
		 * @param {esri/Geometry} [serviceAreaGeometry] When making a selection, use this parameter to filter by a service area geometry.
		 * @returns {dojo/Deferred} The "resolve" function contains a single esri/Graphic parameter if union is true.
		 */
		getSelectionGraphics: function(drawnGeometry, scale, union, serviceAreaGeometry) {
			var self = this, deferred = new Deferred(), type, geometryService;

			function getGeometryService() {
				// Get the default geometry service.
				var geometryService = esriConfig.defaults.geometryService;
				if (!geometryService) {
					(function () {
						var error = new TypeError("esri/config.defaults.geometryService not defined.");
						deferred.reject(error);
						self.emit("error", error);
					}());
				}
				return geometryService;
			}

			/** Performs the statewide aggregate query.
			 */
			function performAggregateQuery() {
				var query, queryTask;
				queryTask = self.getQueryTaskForScale(scale);
				query = new Query();

				type = "statewide";
				// Perform a query for statewide statistics.
				query.outStatistics = self._statisticDefinitions;
				queryTask.execute(query, function (/** {FeatureSet}*/ featureSet) {
					var results, output;
					results = featureSet.features[0].attributes;
					output = new ChartDataQueryResult(type, null, results);
					self.emit("totals-determined", output.chartData);
					self.emit("query-complete", output);
					deferred.resolve(output);
				}, function (/** {Error} */error) {
					var output = {
						type: type,
						query: query,
						error: error
					};
					self.emit("error", output);
					deferred.reject(output);
				});
			}

			function updateTotalsDetermined(totals) {
				self.emit("totals-determined", totals);

				// Update progress on the deferred object.
				deferred.progress({
					message: "totals determined",
					totals: totals
				});
			}

			function performQuery(geometry) {
				var query, queryTask;
				// Get the query task for the current scale.
				queryTask = self.getQueryTaskForScale(scale);
				query = new Query();

				// Setup the query.
				query.geometry = geometry;
				query.outFields = fields.getOutFields();
				query.returnGeometry = true;

				// Query to determine intersecting geometry.
				queryTask.execute(query, function (/** {FeatureSet}*/ featureSet) {
					var totals, geometries, graphic, output, relationParameters;



					/** @typedef Relationship
					 * @property {number} geometry1Index - Index corresponding to the "responseGeometries" array.
					 * @property {number} geometry2Index - Index corresponding to the servideAreaLayer.graphics array. In this app there is only ever one service area graphic, so this will always be 0.
					 */

					/** Adds the county geometries that are inside of the service area to the selection graphics layer.
					 * @param {Relationship[]} relationships
					 */
					function handleRelation(relationships) {
						var i, l, relationship, previouslyEncounteredIndexes = [], features = [], totals;

						for (i = 0, l = relationships.length; i < l; i += 1) {
							relationship = relationships[i];
							if (!arrayContainsValue(previouslyEncounteredIndexes, relationship.geometry1Index)) {
								features.push(featureSet.features[relationship.geometry1Index]);
								previouslyEncounteredIndexes.push(relationship.geometry1Index);
							}
						}

						totals = getTotals(features);
						updateTotalsDetermined(totals);

						output = new ChartDataQueryResult(type, features, totals, drawnGeometry);
						deferred.resolve(output);
						self.emit("query-complete", output);
					}

					// Convert the array of Graphics into corresponding Geometry array.
					geometries = featureSet.features.map(getGeometryFromGraphic);

					if (union) {
						totals = getTotals(featureSet);
						updateTotalsDetermined(totals);

						geometryService = getGeometryService();
						geometryService.union(geometries, function (geometry) {
							graphic = new Graphic(geometry, null, totals);
							output = new ChartDataQueryResult(type, [graphic], totals, null);
							self.emit("query-complete", output);
							deferred.resolve(output);
						}, function (error) {
							error.totals = totals;
							deferred.reject(error);
						});
					} else {

						// TODO: Add intersect operation to limit geometries passed to the relation operation.

						relationParameters = new RelationParameters();
						relationParameters.geometries1 = geometries;
						relationParameters.geometries2 = [serviceAreaGeometry];
						relationParameters.relation = RelationParameters.SPATIAL_REL_INTERIORINTERSECTION;

						geometryService.relation(relationParameters, handleRelation, function (error) {
							deferred.reject(error);
						});
					}
				}, function (error) {
					self.emit("error", error);
					deferred.reject(error);
				});
			}

			// Determine the type of selection query.
			type = !drawnGeometry ? "statewide" : union ? "service area" : "selection";



			if (!drawnGeometry) {
				performAggregateQuery();
			} else {
				if (serviceAreaGeometry) {
					// Perform intersect to limit geometries by service area.
					geometryService = getGeometryService();

					geometryService.intersect([drawnGeometry], serviceAreaGeometry, function (/**{esri/Geometry[]}*/ geometries) {
						if (geometries && geometries.length >= 1) {
							performQuery(geometries[0]);
						}
					}, function (error) {
						self.emit("intersect error", error);
						deferred.reject(error);
					});
					
				} else {
					performQuery(drawnGeometry);
				}


			}

			/**
			 * totals determined event
			 *
			 * @event chartDataProvider#totals-determined
			 * @type {ChartData}
			 */

			/**
			 * query complete event.
			 *
			 * @event chartDataProvider#query-complete
			 * @type {ChartDataQueryResult}
			 */

			/**
			 * error event.
			 *
			 * @event chartDataProvider#error
			 * @type {(error|object)}
			 */

			return deferred.promise;
		},
		/**
		 * @param {string} mapServiceUrl The map service that provides aggregate census data.
		 * @param {Object} [options]
		 * @param {number} options.blockGroupLayerId The ID of layer that provides block group level data. Defaults to 0 if options is omitted.
		 * @param {number} options.tractLayerId The ID of layer that provides tract level data. Defaults to 1 if options is omitted.
		 * @param {number} options.countyLayerId The ID of layer that provides county level data. Defaults to 2 if options is omitted.
		 * @constructs
		 */
		constructor: function (mapServiceUrl, options) {
			if (!mapServiceUrl) {
				throw new TypeError("The map service URL was not provided.");
			}

			// Create the options if not provided.
			if (!options) {
				options = {
					blockGroupLayerId: 0,
					tractLayerId: 1,
					countyLayerId: 2
				};
			}

			// Append a trailing slash to the URL if it does not already have one.
			if (!/\/$/.test(mapServiceUrl)) {
				mapServiceUrl += "/";
			}
			// Create the query tasks.
			this.queryTasks.blockGroup = new QueryTask(mapServiceUrl + String(options.blockGroupLayerId));
			this.queryTasks.tract = new QueryTask(mapServiceUrl + String(options.tractLayerId));
			this.queryTasks.county = new QueryTask(mapServiceUrl + String(options.countyLayerId));

			
		}
	});

	// Make the chart data class available outside the module.
	ChartDataProvider.ChartData = ChartData;
	ChartDataProvider.ChartDataQueryResult = ChartDataQueryResult;

	return ChartDataProvider;
});