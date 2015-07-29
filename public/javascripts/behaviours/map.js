var Hijax = (function ($, Hijax) {

  var container = null,
      column = null,
      world = null,
      view = null,
      projection = null,
      countryVectorSource = null,
      countryVectorLayer = null,
      placemarksVectorSource = null,
      placemarksVectorLayer = null,
      osmTileSource = null,
      osmTileLayer = null,

      standardMapSize = [896, 655],
      standardInitialZoom = 1.85,
      standardMinZoom = 1.85,
      standardMaxZoom = 8,

      defaultCenter = [0, 5000000],

      iconCodes = {
        'organizations': 'users',
        'users': 'user',
        'stories': 'comment'
      },

      colors = {
        'blue-darker': '#2d567b',
        'orange': '#fe8a00'
      },

      markers = {},

      styles = {
        placemark : {

          base : function() {
            return new ol.style.Style({
              text: new ol.style.Text({
                text: '\uf041',
                font: 'normal 1.5em FontAwesome',
                textBaseline: 'Bottom',
                fill: new ol.style.Fill({
                  color: colors['blue-darker']
                }),
                stroke: new ol.style.Stroke({
                  color: 'white',
                  width: 3
                })
              })
            })
          },

          hover : function() {
            return new ol.style.Style({
              text: new ol.style.Text({
                text: '\uf041',
                font: 'normal 2em FontAwesome',
                textBaseline: 'Bottom',
                fill: new ol.style.Fill({
                  color: colors['orange']
                }),
                stroke: new ol.style.Stroke({
                  color: 'white',
                  width: 3
                })
              })
            })
          }
        }
      };

  function getZoomValues() {

    if(
      $('#map').width() / $('#map').height()
      >
      standardMapSize[0] / standardMapSize[1]
    ) {
      // current aspect ratio is more landscape then standart, so take height as constraint
      var size_vactor = $('#map').height() / standardMapSize[1];
    } else {
      // it's more portrait, so take width
      var size_vactor = $('#map').width() / standardMapSize[0];
    }

    size_vactor = Math.pow(size_vactor, 0.5);

    return {
      initialZoom: standardInitialZoom * size_vactor,
      minZoom: standardMinZoom * size_vactor,
      maxZoom: standardMaxZoom * size_vactor
    };

  }

  function getFeatureType(feature) {
    if( typeof feature == 'object' ) {
      var id = feature.getId();
    } else {
      var id = feature;
    }

    if( id.indexOf("urn:uuid") === 0 ) {
      return "placemark";
    } else {
      return "country";
    }
  }

  var hoverState = {
    id : false
  };

  function updateHoverState(pixel) {

    // get feature at pixel
    var feature = world.forEachFeatureAtPixel(pixel, function(feature, layer) {
      return feature;
    });

    // get feature type
    if(feature) {
      var type = getFeatureType( feature );
    }

    // the statemachine ...
    if(
      ! hoverState.id &&
      feature
    ) {
      // ... no popover yet, but now. show it, update position, content and state

      $(popoverElement).show();
      setPopoverContent( feature, type );
      setPopoverPosition( feature, type, pixel );
      setFeatureStyle( feature, 'hover' );
      hoverState.id = feature.getId();
      world.getTarget().style.cursor = 'pointer';

    } else if(
      hoverState.id &&
      feature &&
      feature.getId() == hoverState.id
    ) {
      // ... popover was active for the same feature, just update position

      setPopoverPosition( feature, type, pixel );

    } else if(
      hoverState.id &&
      feature &&
      feature.getId() != hoverState.id
    ) {
      // ... popover was active for another feature, update position, content and state

      setPopoverContent( feature, type );
      setPopoverPosition( feature, type, pixel );
      setFeatureStyle( feature, 'hover' );
      resetFeatureStyle( hoverState.id );
      hoverState.id = feature.getId();

    } else if(
      hoverState.id &&
      ! feature
    ) {
      // ... popover was active, but now no feature is hovered. hide popover and update state

      $(popoverElement).hide();
      resetFeatureStyle( hoverState.id );
      hoverState.id = false;
      world.getTarget().style.cursor = '';

    } else {

      // ... do nothing probably – or did i miss somehting?

    }

  }

  function setFeatureStyle( feature, style ) {

    var feature_type = getFeatureType( feature );

    // neither performant nor elegant ...
    if( feature_type == 'country' ) {
      var current_style = countryVectorLayer.getStyle()(feature);
      feature.setStyle(new ol.style.Style({
        fill: current_style[0].getFill(),
        stroke: new ol.style.Stroke({
          color: '#0c75bf',
          width: 2
        }),
        zIndex: 10
      }));
      return;
    }

    feature.setStyle(
      styles[ feature_type ][ style ]()
    );
  }

  function resetFeatureStyle( feature_id ) {

    if( getFeatureType(feature_id) == 'placemark' ) {
      setFeatureStyle(
        placemarksVectorSource.getFeatureById( feature_id ),
        'base'
      );
    }

    if( getFeatureType(feature_id) == 'country' ) {
      var feature = countryVectorSource.getFeatureById( feature_id );
      feature.setStyle(
        countryVectorLayer.getStyle()(feature)
      );
    }

  }

  function setPopoverPosition(feature, type, pixel) {

    var coord = world.getCoordinateFromPixel(pixel);

    if( type == 'country' ) {
      popover.setPosition(coord);
      popover.setOffset([0, -20]);
    }

    if( type == 'placemark' ) {
      // calculate offset first
      // ... see http://gis.stackexchange.com/questions/151305/get-correct-coordinates-of-feature-when-projection-is-wrapped-around-dateline
      // ... old offest code until commit ae99f9886bdef1c3c517cd8ea91c28ad23126551
      var offset = Math.floor((coord[0] / 40075016.68) + 0.5);
      var popup_coord = feature.getGeometry().getCoordinates();
      popup_coord[0] += (offset * 20037508.34 * 2);

      popover.setPosition(popup_coord);
      popover.setOffset([0, -30]);
    }
  }

  function setPopoverContent(feature, type) {

    var properties = feature.getProperties();

    if( type == "placemark" ) {
      properties.refBy.first = properties.refBy[ Object.keys(properties.refBy)[0] ];
      var content = Mustache.to_html(
        $('#popover' + properties.type + '\\.mustache').html(),
        properties
      );
    }

    if( type == "country" ) {

      // setup empty countrydata, if undefined
      if( typeof properties.country == 'undefined' ) {
        properties.country = {
          key : feature.getId()
        }
      }

      var country = properties.country;

      // set name
      country.name = i18n[ country.key.toUpperCase() ];

      var content = Mustache.to_html(
        $('#popoverCountry\\.mustache').html(),
        country
      );
    }

    $(popoverElement).find('.popover-content').html( content );

  }

  function setAggregations(aggregations) {

    // attach aggregations to country features
    for(var j = 0; j < aggregations["by_country"]["buckets"].length; j++) {
      var aggregation = aggregations["by_country"]["buckets"][j];
      var feature = countryVectorSource.getFeatureById(aggregation.key.toUpperCase());
      if (feature) {
        var properties = feature.getProperties();
        properties.country = aggregation;
        feature.setProperties(properties);
      } else {
        throw 'No feature with id "' + aggregation.key.toUpperCase() + '" found';
      }
    }

    setHeatmapColors(aggregations);

  }

  function setHeatmapColors(aggregations) {

    var heat_data = {};

    // determine focused country

    var focusId = $('[data-view="map"]').attr("data-focus");

    if(
      focusId &&
      getFeatureType(focusId) == "country"
    ) {
      var focused_country = focusId;
    } else {
      var focused_country = false;
    }

    // build heat data hashmap

    for(var j = 0; j < aggregations["by_country"]["buckets"].length; j++) {
      var aggregation = aggregations["by_country"]["buckets"][j];
      heat_data[ aggregation.key.toUpperCase() ] = aggregation["doc_count"];
    }

    // setup d3 color callback

    var heats_arr = _.values(heat_data);
    var get_color = d3.scale.log()
      .range(["#a1cd3f", "#eaf0e2"])
      .interpolate(d3.interpolateHcl)
      .domain([d3.quantile(heats_arr, .01), d3.quantile(heats_arr, .99)]);

    // set style callback

    countryVectorLayer.setStyle(function(feature) {

      if(
        ! focused_country
      ) {
        var stroke_width = 0.5;
        var stroke_color = '#0c75bf';
        var zIndex = 1;

        var color = heat_data[ feature.getId() ] ? get_color( heat_data[ feature.getId() ] ) : "#fff";
      } else if(
        focused_country != feature.getId()
      ) {
        var stroke_width = 0.5;
        var stroke_color = '#0c75bf';
        var zIndex = 1;

        var color_rgb = heat_data[ feature.getId() ] ? get_color( heat_data[ feature.getId() ] ) : "#fff";
        var color_d3 = d3.rgb(color_rgb);
        var color = "rgba(" + color_d3.r + "," + color_d3.g + "," + color_d3.b + ",0.9)";
      } else {
        var stroke_width = 2;
        var stroke_color = '#0c75bf';
        var zIndex = 2;

        var color = heat_data[ feature.getId() ] ? get_color( heat_data[ feature.getId() ] ) : "#fff";
      }

      return [new ol.style.Style({
        fill: new ol.style.Fill({
          color: color
        }),
        stroke: new ol.style.Stroke({
          color: stroke_color,
          width: stroke_width
        }),
        zIndex: zIndex
      })];

    });

  }

  function addPlacemarks(placemarks) {

    placemarksVectorSource.clear();
    placemarksVectorSource.addFeatures(placemarks);

  }

  function getMarkers(resource, origin) {

    origin = origin || resource;
    if (markers[resource['@id']]) {
      for (var i = 0; i < markers[resource['@id']].length; i++) {
        var properties = markers[resource['@id']][i].getProperties();
        if (!properties.refBy[origin['@id']] && origin['@id'] != resource['@id']) {
          properties.refBy[origin['@id']] = origin;
        }
        markers[resource['@id']][i].setProperties(properties);
      }
      return markers[resource['@id']];
    }

    var locations = [];
    var _markers = [];

    if (resource.location && resource.location instanceof Array) {
      locations = locations.concat(resource.location);
    } else if (resource.location) {
      locations.push(resource.location);
    }

    for (var l in locations) {
      if (geo = locations[l].geo) {
        var point = new ol.geom.Point(ol.proj.transform([geo['lon'], geo['lat']], 'EPSG:4326', projection.getCode()));

        var featureProperties = {
          resource: resource,
          refBy: {},
          geometry: point,
          url: "/resource/" + resource['@id'],
          type: resource['@type'],
        };
        featureProperties.refBy[origin['@id']] = origin;

        var feature = new ol.Feature(featureProperties);
        feature.setId(resource['@id']);
        feature.setStyle(styles['placemark']['base']());
        _markers.push(feature);
      }
    }

    if (!_markers.length) {
      for (var key in resource) {
        if ('referencedBy' == key) {
          continue;
        }
        var value = resource[key];
        if (value instanceof Array) {
          for (var i = 0; i < value.length; i++) {
            if (typeof value[i] == 'object') {
              _markers = _markers.concat(
                getMarkers(value[i], origin)
              );
            }
          }
        } else if (typeof value == 'object') {
          _markers = _markers.concat(
            getMarkers(value, origin)
          );
        }
      }
    }

    markers[resource['@id']] = _markers;
    return _markers;

  }


  var my = {

    init: function(context) {

      column = $('<div role="complementary" class="color-scheme-map column large" data-view="map"></div>');
      $('body', context).append(column);

      // Get mercator projection
      projection = ol.proj.get('EPSG:3857');

      // Override extents
      (
        function() {
          var overrides = {
            "FR": [[-8, 52], [15, 41]],
            "RU": [[32, 73], [175, 42]],
            "US": [[-133, 52], [-65, 25]],
            "NL": [[1, 54], [10, 50]],
            "NZ": [[160, -32], [171, -50]]
          };
          var getGeometry = ol.Feature.prototype.getGeometry;
          var transform = ol.proj.getTransform('EPSG:4326', projection.getCode());
          ol.Feature.prototype.getGeometry = function() {
            var result = getGeometry.call(this);
            var id = this.getId();
            if (id in overrides) {
              result.getExtent = function() {
                return ol.extent.applyTransform(ol.extent.boundingExtent(overrides[id]), transform);
              }
            }
            return result;
          }
        }
      )();

      // Map container
      container = $('<div id="map"></div>')[0];
      column.prepend(container);

      // Country vector source
      countryVectorSource = new ol.source.Vector({
        url: '/assets/json/ne_50m_admin_0_countries_topo.json',
        format: new ol.format.TopoJSON(),
        // noWrap: true,
        wrapX: true
      });

      // Country vector layer
      countryVectorLayer = new ol.layer.Vector({
        source: countryVectorSource
      });

      // Placemarks vector source
      placemarksVectorSource = new ol.source.Vector({
        wrapX: true
      });

      // Placemarks vector layer
      placemarksVectorLayer = new ol.layer.Vector({
        source: placemarksVectorSource
      });

      // OSM tile source
      osmTileSource = new ol.source.OSM({
        url: 'https://{a-c}.tiles.mapbox.com/v4/johjoh.oer_worldmap/{z}/{x}/{y}.png?access_token=pk.eyJ1Ijoiam9oam9oIiwiYSI6Imd3bnowY3MifQ.fk6HYuu3q5LzDi3dyip0Bw'
      });

      // OSM tile layer
      osmTileLayer = new ol.layer.Tile({
        source: osmTileSource,
        opacity: 1
      });

      // Get zoom values adapted to map size
      var zoom_values = getZoomValues();

      // View
      view = new ol.View({
        center: defaultCenter,
        projection: projection,
        zoom: zoom_values.initialZoom,
        minZoom: zoom_values.minZoom,
        maxZoom: zoom_values.maxZoom
      });

      // Map object
      world = new ol.Map({
        layers: [countryVectorLayer, osmTileLayer, placemarksVectorLayer],
        target: container,
        view: view
      });

      world.on('pointermove', function(evt) {
        if (evt.dragging) { return; }
        var pixel = world.getEventPixel(evt.originalEvent);
        updateHoverState(pixel);
      });

      world.on('click', function(evt) {
        var feature = world.forEachFeatureAtPixel(evt.pixel, function(feature, layer) {
          return feature;
        });
        if (feature) {
          var properties = feature.getProperties();
          var url;
          if (properties.url) {
            url = properties.url;
          } else {
            url = "/country/" + feature.getId().toLowerCase();
            world.getView().fit(feature.getGeometry().getExtent(), world.getSize());
          }
          Hijax.goto($('<a></a>').attr('href', url), true);
        }
      });

      // init popover
      popoverElement = $('<div class="popover fade top in" role="tooltip"><div class="arrow"></div><div class="popover-content"></div></div>')[0];
      popover = new ol.Overlay({
        element: popoverElement,
        positioning: 'bottom-center',
        stopEvent: false,
        wrapX: true
      });
      world.addOverlay(popover);

      // switch style
      $(this).addClass("map-view");

      // Defer until vector source is loaded
      var deferred = new $.Deferred();
      if (countryVectorSource.getFeatureById("BR")) { // Is this a relieable test?
        deferred.resolve();
      } else {
        var listener = countryVectorSource.on('change', function(e) {
          if (countryVectorSource.getState() == 'ready') {
            ol.Observable.unByKey(listener);
            deferred.resolve();
          }
        });
      }
      return deferred;
    },

    attach : function(context) {

      var zoomed = false;

      // Populate map with pins from single resources
      $('article.resource-story', context)
        .add($('div.resource-organization', context))
        .add($('div.resource-action', context))
        .each(function() {
          var json = JSON.parse( $(this).find('script[type="application/ld+json"]').html() );
          var markers = getMarkers(json);
          addPlacemarks( markers );
          world.getView().fit(placemarksVectorSource.getExtent(), world.getSize());
          zoomed = true;
        });

      // Populate map with pins from resource listings
      // FIXME: don't use class names for js actions -> reorganize behaviours
      $('.populate-map', context).each(function() {
        var json = JSON.parse( $(this).find('script[type="application/ld+json"]').html() );
        var markers = [];
        for (i in json) {
          var markers = markers.concat( getMarkers(json[i]) );
        }
        addPlacemarks( markers );
      });

      // Link list entries to pins
      $('[data-behaviour="linkedListEntries"]', context).each(function() {
        $( this ).on("mouseenter", "li", function() {
          var id = this.getAttribute("about");
          var json = JSON.parse( $(this).closest("ul").children('script[type="application/ld+json"]').html() );
          var resource = json.filter(function(resource) {
            return resource['@id'] == id;
          })[0];
          var markers = getMarkers(resource);
          for (var i = 0; i < markers.length; i++) {
            markers[i].setStyle(styles.placemark.hover());
          }
        });
        $( this ).on("mouseleave", "li", function() {
          var id = this.getAttribute("about");
          var json = JSON.parse( $(this).closest("ul").children('script[type="application/ld+json"]').html() );
          var resource = json.filter(function(resource) {
            return resource['@id'] == id;
          })[0];
          var markers = getMarkers(resource);
          for (var i = 0; i < markers.length; i++) {
            markers[i].setStyle(styles.placemark.base());
          }
        });
      });

      // Add heat map data
      $('[about="#users-by-country"]', context).each(function() {
        var json = JSON.parse( $(this).find('script[type="application/ld+json"]').html() );
        setAggregations( json );
      });

      // Zoom to country
      $('.resource.country', context).each(function() {
        var json = JSON.parse( $(this).find('script[type="application/ld+json"]').html() );
        var country = countryVectorSource.getFeatureById(json['@id']);
        if (country) {
          world.getView().fit(country.getGeometry().getExtent(), world.getSize());
          zoomed = true;
        }
      });

      // If nothing triggered a zoom, reset
      if (!zoomed) {
        world.getView().fit(countryVectorSource.getExtent(), world.getSize());
      }

    }

  };

  Hijax.behaviours.map =  my;
  return Hijax;


  // Mollweide Projection

  /*
        proj4.defs('ESRI:53009', '+proj=moll +lon_0=0 +x_0=0 +y_0=0 +a=6371000 ' +
            '+b=6371000 +units=m +no_defs');
  */

        // Configure the Sphere Mollweide projection object with an extent,
        // and a world extent. These are required for the Graticule.
  /*
        var sphereMollweideProjection = new ol.proj.Projection({
          code: 'ESRI:53009',
          extent: [-9009954.605703328, -9009954.605703328,
            9009954.605703328, 9009954.605703328],
          worldExtent: [-179, -90, 179, 90]
        });
  */

  /*
        projection.setWorldExtent(
          [-180, -10, 180, 10]
        );
  */

  /*
        console.log("extent", projection.getExtent());
        console.log("worldExtent", projection.getWorldExtent());
        console.log("global", projection.isGlobal());
  */

  /*
        projection.setExtent(
          [-20037508.342789244, -1037508.342789244, 20037508.342789244, 1037508.342789244]
        );
  */


  /*
        var extent = [-20037508.342789244, -1037508.342789244, 20037508.342789244, 1037508.342789244];
        var constrainPan = function() {
            var visible = view.calculateExtent(world.getSize());
            var centre = view.getCenter();
            var delta;
            var adjust = false;
            if ((delta = extent[0] - visible[0]) > 0) {
                adjust = true;
                centre[0] += delta;
            } else if ((delta = extent[2] - visible[2]) < 0) {
                adjust = true;
                centre[0] += delta;
            }
            if ((delta = extent[1] - visible[1]) > 0) {
                adjust = true;
                centre[1] += delta;
            } else if ((delta = extent[3] - visible[3]) < 0) {
                adjust = true;
                centre[1] += delta;
            }
            if (adjust) {
                view.setCenter(centre);
            }
        };
        view.on('change:resolution', constrainPan);
        view.on('change:center', constrainPan);
  */


        // Zoom to extent ... extent seem to be buggy, so this is done by initial zoom relative to mapsize
        // extent format: [minX, minY, maxX, maxY]
  /*
        var mapSize = world.getSize();
        var extent = countryVectorLayer.getSource().getExtent();
        extent = [-13037508.342789244, -5000000, 13037508.342789244, 13000000]
        world.getView().fitExtent(extent, mapSize);
  */

        // Grid
        /*var graticule = new ol.Graticule({
          map: world,
          strokeStyle: new ol.style.Stroke({
            color: 'rgba(255,120,0,0.9)',
            width: 1.5,
            lineDash: [0.5, 4]
          })
        });*/

})(jQuery, Hijax);
