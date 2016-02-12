// <----- INIT VARIABLES ----->
var width = d3.select("#underground-map").node().getBoundingClientRect().width,// || 1000,
    //height = width * 10 / 16;
    height = d3.select("#underground-map").node().getBoundingClientRect().height || width * 0.45;//10 / 16;

var svg = d3.select("#underground-map").append('svg')
    .attr('width', width)
    .attr('height', height)

var padding = {top: 20, right: 20, bottom: 20, left: 20};
var tableWidth = 250;
var mapWidth = width - padding.left - padding.right;// - tableWidth;
var mapHeight = height - padding.top - padding.bottom;

// <----- OPTIONS AND DATA STORAGE VARIABLES ----->

var selectedStationId,
    selectedStationTravelTimes,
    mouseOverStationId;

var enableTimeDistortion = true;
var enableRouteHighlighting = true;

var transitionDuration = 750;

// <----- CREATE ZOOM GROUP ----->

var zoomGroup = svg.append('g')
    .attr('id', 'zoom-group');

// <----- CREATE MAP GROUP ----->

var mapGroup = zoomGroup.append('g')
    .attr('id', 'map-group')
    .attr('width', mapWidth)
    .attr('height', mapHeight)
    .attr('transform', function() { return 'translate(' + padding.left + ', ' + padding.top + ')'; });

 // <----- DEFINE SCALES ----->

var minLat = d3.min(data, function(d) { return d.latitude; }),
    minLng = d3.min(data, function(d) { return d.longitude; }),
    maxLat = d3.max(data, function(d) { return d.latitude; }),
    maxLng = d3.max(data, function(d) { return d.longitude; });

var dLng = (maxLng - minLng) / mapWidth,
    dLat = (maxLat - minLat) / mapHeight;

var xRange = dLng > dLat ? mapWidth : mapWidth * dLng / dLat,
    yRange = dLng > dLat ? mapHeight * dLat / dLng : mapHeight;

var xScale = d3.scale.linear()
    .domain([minLng, maxLng])
    .range([0, xRange]);

var yScale = d3.scale.linear()
    .domain([minLat, maxLat])
    .range([yRange, 0]); // Northern hemisphere!

// Add x and y position variables to data so they can be more easily changed later
for (var i = 0; i < data.length; i ++) {
    data[i].x = xScale(data[i].longitude);
    data[i].y = yScale(data[i].latitude);
}

// <----- CREATE STATION GROUPS ----->

var stationGroups = mapGroup.selectAll('g')
    .data(data)
    .enter()
        .append('g')
        .attr('class', 'station-group')
        .attr('id', function (d) { return stringToSelector(d.name); });

// <----- DRAW STATIONS ----->

var stations = stationGroups.append('circle')
    .attr('class', 'station');

stations
    .attr('cx', function(d) { return d.x; })
    .attr('cy', function(d) { return d.y; })
    .attr('r', 1.5);

// <----- DRAW LINES ----->

var lines = stationGroups.selectAll('line')
    .data(function(d) { return d.destinations; })
    .enter()
        .append('line')

lines
    .attr('x1', function() { return this.parentNode.__data__.x; })
    .attr('y1', function() { return this.parentNode.__data__.y; })
    .attr('x2', function(d) { return data[d.station_id - 1].x; })
    .attr('y2', function(d) { return data[d.station_id - 1].y; })
    .attr('id', function(d) { return lineId(this.parentNode.__data__.name, d.name, d.line_name); })
    .attr('class', function(d) { return stringToSelector(d.line_name); });

// <----- DRAW STATION LABELS ----->

var stationLabels = stationGroups.append('text')
    .attr('class', 'station-label')
    .attr('id', function(d) { return stringToSelector(d.name + ' station label'); })
    .text(function(d) { return d.name; })
    .attr('x', function(d) { return d.x; })
    .attr('y', function(d) { return d.y; })
    //.attr('dy', function(d) { return labelFontSize(); })
    .style({'font-size': labelFontSize()});

// <----- DRAW VORONOI ----->

drawVoronoi();

// <----- ZOOM BEHAVIOUR ----->

var zoomBehavior = d3.behavior.zoom()
    .scaleExtent([0.25, 8.0])
    .on('zoom', zoom);

var currentScale = 1; // To properly initialise font sizes

zoomGroup.call(zoomBehavior)
    .on('dblclick.zoom', null); // Disable the double click zoom (double click for refocus)

function zoom() {
    mapGroup.attr('transform', 'translate(' + d3.event.translate + ') scale(' + d3.event.scale + ')');
    currentScale = d3.event.scale;

    //stations
        //.attr('r', (2 / d3.event.scale))
        //.attr('style', function() { return 'stroke-width:' + (1/d3.event.scale); });

    lines.style({'stroke-width': (1/Math.sqrt(d3.event.scale))});
    stationLabels
        .style({'font-size': labelFontSize()})
        .attr('dy', -d3.event.scale / 2); //labelFontSize());
}

// <----- UI ----->

uiGroup = svg.append('g')
    .attr('id', 'ui-group');

// <----- RESET BUTTON ----->

resetButtonGroup = uiGroup.append('g')
    .attr('id', 'reset-button-group')

resetButton = resetButtonGroup.append('rect')
    .attr('x', 10)
    .attr('y', 10)
    .attr('rx', 5)
    .attr('ry', 5)
    .attr('width', 100)
    .attr('height', 40)
    .attr('id', 'reset-button')
    .attr('class', 'button');

resetButtonGroup.append('text')
    .attr('x', 60)
    .attr('y', 35)
    .text('Reset')
    .attr('class', 'button-text')
    .attr('id', 'reset-button-text');

// <----- DATA TABLE ----->

var tableSortBy = 'stationName';

var tableDiv = d3.select('div#data-table-div')
    .style({'width': tableWidth,
            'height': mapHeight});

var table = d3.select('#data-table')
    .attr('width', tableWidth)
    .attr('height', mapHeight);

var thead = table.select('thead'),
    stationHead = thead.select('#th-station-name'),
    travelTimeHead = thead.select('#th-travel-time');

var tbody = table.select('tbody');

var searchTextBox = tableDiv.select('input#data-table-textbox')
    .style({'width': function() { return tableWidth + 'px'; }});

var tableRows = tbody.selectAll('tr')
    .data(data)
        .enter()
            .append('tr')
                .attr('id', function(d) { return 'tr-' + d.id; });

var tableData = tableRows.selectAll('td')
    .data(function(d) { return selectedStationId ? [d.name, selectedStationTravelTimes[d.id - 1].travelTime] : [d.name] })
        .enter()
            .append('td')
                .html(function(d) { return '<a href="#">' + d + '</a>'; });

// <----- TITLE ----->

// <----- LEGEND ---->

var legendGroup = svg.append('g')
    .attr('id', 'legend-group');

legendItems = [{name: 'Bakerloo Line', colour: '#894e24'},
               {name: 'Central Line', colour: '#dc241f'},
               {name: 'Circle Line', colour: '#ffce00'},
               {name: 'District Line', colour: '#007299'},
               {name: 'East London Line', colour: '#e86a10'},
               {name: 'Hammersmith & City Line', colour: '#d799af'},
               {name: 'Jubilee Line', colour: '#6a7278'},
               {name: 'Metropolitan Line', colour: '#751056'},
               {name: 'Northern Line', colour: '#000'},
               {name: 'Piccadilly Line', colour: '#0019a8'},
               {name: 'Victoria Line', colour: '#00a0e2'},
               {name: 'Waterloo & City Line', colour: '#76d0bd'},
               {name: 'Docklands Light Railway', colour: '#00afad'}]

var legendItemGroups = legendGroup.selectAll('g.legendItemGroup')
    .data(legendItems)
        .enter()
            .append('g')
                .attr('class', 'legendItemGroup');

legendItemGroups.append('line')
    .attr('x1', 0)
    .attr('x2', 20)
    .attr('y1', function(d, i) { return i * 10; })
    .attr('y2', function(d, i) { return i * 10; })
    .attr('class', 'legend-line')
    .style({'stroke': function(d) { return d.colour; }, 'stroke-width': 2});

legendItemGroups.append('text')
    .attr('x', 30)
    .attr('y', function(d, i) { return i * 10; })
    .attr('class', 'legend-label')
    .text(function(d) { return d.name; });

legendGroup.attr('transform', 'translate(20, 80)');

// <----- INFORMATION ----->

// <----- EVENT HANDLERS ----->

stationGroups.on('mouseover', function(d) {
    mouseOverStationId = d.id;
    mouseOver();
});

stationGroups.on('mouseout', mouseOut);

zoomGroup.on('mouseout', unhighlightPath);

stationGroups.on('dblclick', function(d) { doubleClickStation(d); });

resetButtonGroup.on('click', reset);

searchTextBox.on('keyup', updateTable);
searchTextBox.on('search', updateTable);

tableRows.on('mouseover', function() {
    mouseOverStationId = +d3.select(this).attr('id').slice(3);
    mouseOver();
});

tableRows.on('click', function() {
    doubleClickStation(data[d3.select(this).attr('id').slice(3) - 1]);
});

tableRows.on('mouseout', mouseOut);

stationHead.on('click', function() { tableSortBy = (tableSortBy == 'stationName' ? 'stationNameReverse' : 'stationName'); updateTable(); });
travelTimeHead.on('click', function() { tableSortBy = (tableSortBy == 'travelTime' ? 'travelTimeReverse' : 'travelTime'); updateTable(); });

legendItemGroups.on('mouseover', function(g) {
    lines.classed({'unhighlight': true});
    d3.selectAll('line.' + stringToSelector(d3.select(g)[0][0].name)).classed({'unhighlight': false});
});

legendItemGroups.on('mouseout', function() {
    lines.classed({'unhighlight': false});
});

// <----- FUNCTIONS ----->

// <----- EVENT HANDLING FUNCTIONS ----->

function mouseOver() {
    var station_name = data[mouseOverStationId - 1].name;
    d3.select('#' + stringToSelector(station_name + ' station label'))
        .classed({'active': true});
    d3.select('tr#tr-' + mouseOverStationId)
        .classed({'active': true});

    if (enableRouteHighlighting) highlightPath(selectedStationId, mouseOverStationId);
}

function mouseOut() {
    d3.selectAll('tr').classed({'active': false});
    stationLabels.classed({'active': false});
}

function doubleClickStation(d) {
    selectedStationId = d.id;
    refocus();
    updateTable();
}

function toggleTimeDistortion() {
    enableTimeDistortion = d3.select('input#toggle-time-distortion').property('checked');

    for (var i = 0; i < data.length; i ++) {
        data[i].x = xScale(data[i].longitude);
        data[i].y = yScale(data[i].latitude);
    }

    removeTimeContours();
    refocus();
    redraw();
}

function toggleRouteHighlighting() {
    enableRouteHighlighting = d3.select('input#toggle-route-highlighting').property('checked');
    if (!enableRouteHighlighting) unhighlightPath();
}

// <----- DATA TABLE FUNCTIONS ----->
function updateTable() {
    var searchString = searchTextBox.property('value');
    var tableData = data.slice(); // deep copy of data
    var sortedTableData;

    if (searchString) {
        tableData = tableData.filter(function(d, i) { return removePunctuation(d.name.toLowerCase()).search(removePunctuation(searchString.toLowerCase())) >= 0; });
    }

    switch(tableSortBy) {
        case 'stationName':
            sortedTableData = tableData;
            break;
        case 'stationNameReverse':
            sortedTableData = tableData.sort(function(a, b) { return (b.name > a.name) ? 1 : ((a.name > b.name) ? -1 : 0); });
            break;
        case 'travelTime':
            if (selectedStationId) {
                sortedTableData = tableData.sort(function(a, b) {
                    var aTravelTime = selectedStationTravelTimes[a.id - 1].time,
                        bTravelTime = selectedStationTravelTimes[b.id - 1].time;
                    return (aTravelTime > bTravelTime) ? 1 : ((bTravelTime > aTravelTime) ? -1 : 0);
                });
                break;
            }
        case 'travelTimeReverse':
            if (selectedStationId) {
                sortedTableData = tableData.sort(function(a, b) {
                    var aTravelTime = selectedStationTravelTimes[a.id - 1].time,
                        bTravelTime = selectedStationTravelTimes[b.id - 1].time;
                    return (bTravelTime > aTravelTime) ? 1 : ((aTravelTime > bTravelTime) ? -1 : 0);
                });
                break;
            }
        default:
            sortedTableData = tableData;
    }

    tbody.selectAll('tr').remove();
    tableRows = tbody.selectAll('tr')
        .data(sortedTableData, function(d) { return d.id; })
        .order();

    tableRows.exit().remove();

    tableRows = tableRows
        .enter()
            .append('tr')
                .attr('id', function(d) { return 'tr-' + d.id; });

    tableRows.selectAll('td').remove();
    tableRows.selectAll('td')
        .data(function(d) { return selectedStationId ? [d.name, selectedStationTravelTimes[d.id - 1].time + ' mins'] : [d.name]; })
        .enter()
            .append('td')
                .html(function(d) { return '<a href="#">' + d + '</a>'; });

    tbody.order();

    tableRows.on('mouseover', function() {
        mouseOverStationId = +d3.select(this).attr('id').slice(3);
        mouseOver();
    });

    tableRows.on('click', function() {
        doubleClickStation(data[d3.select(this).attr('id').slice(3) - 1]);
    });

    tableRows.on('mouseout', mouseOut);
}

// <----- STATION LABELS ----->

function labelFontSize() {
    // return 14 / currentScale || 14; // currentScale may not initialise before first call so set default of 14
    return 12 / currentScale;
}

// <----- STRING FUNCTIONS ----->

function lineId(from_name, to_name, line_name) {
    var s = from_name + ' to ' + to_name + ' ' + line_name;
    return stringToSelector(s);
}

function stringToSelector(s) {
    s = s.replace('&', 'and'); // & is illegal
    s = s.replace("'", ""); // ' is illegal
    s = s.replace(/\s+/g, '-'); // Replace spaces with -
    s = s.replace('(', ''); // ( is illegal
    s = s.replace(')', ''); // ) is illegal
    s = s.replace(',', ''); // , is illegal
    s = s.replace('.', ''); // . is illegal
    s = s.toLowerCase();
    return s;
}

function removePunctuation(s) {
    return s.replace(/[^\w\s]|_/g, "").replace(/\s+/g, " ");
}

// <----- DRAW VORONOI ----->

function drawVoronoi() {
    var v = d3.geom.voronoi()
        .x(function(d) { return d.x; })
        .y(function(d) { return d.y; })
        // .clipExtent([0, 0], [mapWidth, mapHeight]); // Breaks the nodes near the edge?
    v = v(data);

    var voronoi = stationGroups.append('path')
            .attr('class', 'voronoi')
            .attr('d', function(d, i) { return 'M' + v[i].join('L') + 'Z'; });

};

// <----- CALCULATE TRAVEL TIMES ----->

function travelTimes(station_id) {
    // Implementation of Dijkstra's algorithm on the data
    var lineChangePenalty = 5; // Average time to change lines
    var inf = 10000;

    arr = [];
    for (var i = 0; i < data.length; i++) {
        arr[i] = {'time': inf, 'path': [], 'visited': false, 'station_id': i + 1};
    }

    var i = station_id - 1;
    var d, t, p;
    arr[i].time = 0;

    var next_i = function() {
        var min_path = d3.min(arr, function(d) { return d.visited ? inf : d.path.length ? d.path.length: inf; });
        for (var x = 0; x < arr.length; x ++) {
            if (!arr[x].visited && arr[x].path.length == min_path) { return x; }
        }
        return -1;
    };

    for (var counter = 0; counter < arr.length; counter ++) {
        for (var d_i = 0 ; d_i < data[i].destinations.length; d_i ++) {
            d = data[i].destinations[d_i];
            t = arr[i].time + d.time;
            if (arr[i].path.length && arr[i].path[arr[i].path.length - 1].line_id != d.line_id) {
                t += lineChangePenalty;
            }

            if (t < arr[d.station_id - 1].time) {
                arr[d.station_id - 1].time = t;
                p = arr[i].path.slice(); // deep copy of path
                p.push({'start_id': data[i].id,
                        'start_name': data[i].name,
                        'destination_id': d.station_id,
                        'destination_name': d.name,
                        'line_id': d.line_id,
                        'line_name': d.line_name});
                arr[d.station_id - 1].path = p;
            }
        }
        arr[i].visited = true;
        i = next_i();
    }

    return arr;
}

// <----- REDRAW MAP ----->

function redraw() {
    stationGroups.selectAll('path.voronoi').remove();

    stations
        .transition()
            .duration(transitionDuration)
            .attr('cx', function(d) { return d.x; })
            .attr('cy', function(d) { return d.y; });

    lines
        .transition()
            .duration(transitionDuration)
            .attr('x1', function() { return this.parentNode.__data__.x; })
            .attr('y1', function() { return this.parentNode.__data__.y; })
            .attr('x2', function(d) { return data[d.station_id - 1].x; })
            .attr('y2', function(d) { return data[d.station_id - 1].y; })

    stationLabels
        .transition()
            .duration(transitionDuration)
            .attr('x', function(d) { return d.x; })
            .attr('y', function(d) { return d.y; });

    drawVoronoi();
}

// <----- REFOCUS ON STATION ----->

function refocus() {

    if (!selectedStationId) { return null; }
    var d = data[selectedStationId - 1];

    var tvlTimes = travelTimes(d.id),
        px_per_degree = 2500, // scaling factor for the magnitude
        //stationX = data[d.id - 1].x, // Do not move the clicked station
        stationX = xScale(data[d.id - 1].longitude), // Reset the clicked station to it's original location
        //stationY = data[d.id - 1].y, // Do not move the clicked station
        stationY = yScale(data[d.id - 1].latitude), // Reset the clicked station to it's original location
        relativeXY = [],
        r;

    if (enableTimeDistortion) {
        for (var i = 0; i < data.length; i ++) {
            r = {'d_lng': data[i].longitude - data[d.id - 1].longitude,
                 'd_lat': data[i].latitude - data[d.id - 1].latitude};
            r.magnitude = Math.sqrt(r.d_lng * r.d_lng + r.d_lat * r.d_lat);
            r.travelTime = tvlTimes[i].time;
            r.u_lng = r.d_lng / r.magnitude || 0; // div0 on d
            r.u_lat = r.d_lat / r.magnitude || 0; // div0 on d
            relativeXY.push(r);
        }

        // Fixed scale based on pixels per minute travel time
        var px_per_min = 10;
        var mScale = d3.scale.linear()
            .domain([0, 1])
            .range([0, px_per_min]);

        for (var i = 0; i < data.length; i ++) {
            data[i].x = stationX + mScale(relativeXY[i].u_lng * relativeXY[i].travelTime);
            data[i].y = stationY - mScale(relativeXY[i].u_lat * relativeXY[i].travelTime); // Northern Hemisphere
        }
    }

    stationLabels
        .text(function (x) { return x.name + (tvlTimes[x.id - 1].time > 0 ? ' ' + tvlTimes[x.id - 1].time + ' min' + (tvlTimes[x.id - 1].time > 1 ? 's' : '') : ''); });

    stations.classed({'selected': false});
    mapGroup.select('g.station-group#' + stringToSelector(d.name))
        .select('circle.station')
            .classed({'selected': true});

    selectedStationTravelTimes = tvlTimes;

    redraw();
    // setTimeout(function() { drawTimeContours(d, px_per_min); }, 1000);
    drawTimeContours(d, px_per_min);
}

// <----- ADD TRAVEL TIME CIRCLES ----->

var contoursGroup,
    timeCircles;

function drawTimeContours(d, px_per_min) {

    if (!contoursGroup || !contoursGroup.size()) {
        contoursGroup = mapGroup.insert('g', ':first-child') // Insert so it is at the back
            .attr('id', 'contours-group');
    }

    var maxTime = 120,
        dt = 5,
        dr = dt * px_per_min,
        max_r = maxTime * px_per_min,
        cx = data[d.id - 1].x,
        cy = data[d.id - 1].y;

    timeCircles = contoursGroup.selectAll('circle.time-contour')
        .data(d3.range(max_r, 0, -dr));

    timeCircles.enter()
        .append('circle')
            .attr('class', 'time-contour')
            .classed({'odd': function(d, i) { return i % 2; }})
            .attr('cx', cx)
            .attr('cy', cy)
            .attr('r', function(d) { return d; });

    timeCircles
        .transition()
            .duration(transitionDuration)
            .attr('cx', cx)
            .attr('cy', cy)
            .attr('r', function(d) { return d; });
}

function removeTimeContours() {
    contoursGroup.selectAll('circle.time-contour').remove();
}

// <----- HIGHLIGHT PATH ----->

function highlightPath(from_id, to_id) {
    if (!from_id || !to_id) { return null; }

    var path = selectedStationTravelTimes[to_id - 1].path;

    lines.classed({'unhighlight': true});

    mapGroup.selectAll('.highlight-path').remove();
    highlightPathGroup = mapGroup.selectAll('g#highlight-path-group')
        .append('g')
            .attr('class', 'highlight-path')
            .attr('id', 'highlight-path-group');

    highlightPathLines = highlightPathGroup
        .data(path)
            .enter()
                .append('line');

    highlightPathLines
        .attr('x1', function(d) { return data[d.start_id - 1].x; })
        .attr('x2', function(d) { return data[d.destination_id - 1].x; })
        .attr('y1', function(d) { return data[d.start_id - 1].y; })
        .attr('y2', function(d) { return data[d.destination_id - 1].y; })
        .attr('class', function(d) { return stringToSelector(d.line_name) + ' highlight-path'; });

}

function unhighlightPath() {
    lines.classed({'unhighlight': false});
    mapGroup.selectAll('.highlight-path').remove();
}

// <----- RESET ALL ----->

function reset() {
    for (var i = 0; i < data.length; i ++) {
        data[i].x = xScale(data[i].longitude);
        data[i].y = yScale(data[i].latitude);
    }

    stationLabels.text(function(d) { return d.name; });

    lines.classed({'unhighlight': false});
    stations.classed({'selected': false});
    selectedStationId = null;
    mapGroup.selectAll('.highlight-path').remove();
    removeTimeContours();
    updateTable();

    redraw();
}
