// Initialize pubnub
var pubnub = PUBNUB.init({
    subscribe_key: 'demo'
});

// Set Global Start Date
var startDate = ((Date.now() - 1000 * 60 * 60 * 24) * 10000);

// HistoryLoader
// This object loads the history in increments for a given channel
// ex.
// var loader = new HistoryLoader(pubnub, 'my_channel');
// loader.loadHistory(startDate, 1000 * 60 * 60, function (data) {
//    console.log("I got", dat);
// });
function HistoryLoader(pubnub, channel) {
    this.pubnub = pubnub;
    this.channel = channel;
};

// Loads one piece of data for every <increment> and gives it to <callback>
HistoryLoader.prototype.loadHistory = function(startDate, increment, callback) {
    var data = [], that = this;

    function getHistory(history) {
        if (history.length === 1) {
            // Just push one value since we are only requesting one
            data.push(history[0]);

            // Increment our date
            startDate += increment

            // Request the next value
            that.getHistory(startDate, 1, getHistory);
        } else {
            // We have reached the end
            callback(data);
        }
    };

    // Start the recursion
    this.getHistory(startDate, 1, getHistory);
};

// Gets history for the given <date> and <count>
HistoryLoader.prototype.getHistory = function(date, count, callback) {
    // PubNub wants dates with greater precision
    date *= 10000

    pubnub.history({
        channel: this.channel,
        count: count,
        start: date,
        reverse: true,
        callback: function (history) {
            callback(history[0]);
        }
    });
};

// Create the main graph
var margin = {top: 10, right: 10, bottom: 100, left: 60},
    margin2 = {top: 430, right: 10, bottom: 20, left: 60},
    width = 640 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom,
    height2 = 500 - margin2.top - margin2.bottom;

var parseDate = d3.time.format("%b %Y").parse;

var x = d3.time.scale().range([0, width]),
    x2 = d3.time.scale().range([0, width]),
    y = d3.scale.linear().range([height, 0]),
    y2 = d3.scale.linear().range([height2, 0]);

var xAxis = d3.svg.axis().scale(x).orient("bottom"),
    xAxis2 = d3.svg.axis().scale(x2).orient("bottom"),
    yAxis = d3.svg.axis().scale(y).orient("left");

var brush = d3.svg.brush()
    .x(x2)
    .on("brush", brushed);

var area = d3.svg.area()
    .interpolate("monotone")
    .x(function(d) { return x(d.T); })
    .y0(height)
    .y1(function(d) { return y(d.L); });

var area2 = d3.svg.area()
    .interpolate("monotone")
    .x(function(d) { return x2(d.T); })
    .y0(height2)
    .y1(function(d) { return y2(d.L); });

var svg = d3.select("#chart").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

svg.append("defs").append("clipPath")
    .attr("id", "clip")
    .append("rect")
    .attr("width", width)
    .attr("height", height);

var focus = svg.append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

var context = svg.append("g")
    .attr("transform", "translate(" + margin2.left + "," + margin2.top + ")");

// Create a store for graph's data
var graphData = [];

var path1, gx1, gy1, path2, gx2, gy2, tooltip;

// Parse into a Date object and extract float value
function convertData(d) {
    d.T = new Date(parseFloat(d.T) / 10000);
    d.L = parseFloat(d.L);
    d.F = parseFloat(d.F);
    d.M = parseFloat(d.M);
};

// Initially load the graph with historical data and assign variables
function loadData(data) {
    data.forEach(convertData);

    // Initially setup the domains
    x.domain(d3.extent(data.map(function(d) { return d.T; })));
    var maximum = d3.max(data.map(function(d) { return d.L; })),
        minimum = d3.min(data.map(function (d) { return d.L; }));
    y.domain([minimum - 10, maximum + 10]);
    x2.domain(x.domain());
    y2.domain(y.domain());

    // Set up the graph components
    path1 = focus.append("path")
        .attr("clip-path", "url(#clip)");

    gx1 = focus.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

    gy1 = focus.append("g")
        .attr("class", "y axis");

    path2 = context.append("path");

    gx2 = context.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height2 + ")");

    gy2 = context.append("g")
        .attr("class", "x brush")
        .call(brush)
        .selectAll("rect")
        .attr("y", -6)
        .attr("height", height2 + 7);

    // Add label
    focus.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .text("Price");

    // Add tooltip
    tooltip = d3.select('body').append('div')
        .attr('class', 'tooltip')
        .style('opacity', 0);
};

// Called when a new graph value comes in
function addData(newValue, data) {
    // Extract the values we need from the data and format them properly
    convertData(newValue);

    data.push(newValue);
};

// When we get a new value, update the graph with new data
function updateData(data) {
    x.domain(d3.extent(data.map(function(d) { return d.T; })));
    var maximum = d3.max(data.map(function(d) { return d.L; })),
        minimum = d3.min(data.map(function (d) { return d.L; }));
    y.domain([minimum - 10, maximum + 10]);
    x2.domain(x.domain());
    y2.domain(y.domain());

    path1.datum(data)
        .attr("d", area);

    gy1.call(yAxis);

    path2.datum(data)
        .attr("d", area2);

    gx2.call(xAxis2);

    brushed();

    // Add new circle
    svg.selectAll("circle")
        .data(data)
        .enter().append("circle")
        .attr("r", 5)
        .attr("cx", function (d) {
            var cx = x(d.T) + margin.left;
            if (cx < margin.left) {
                cx = -50;
            }
            return cx;
        })
        .attr("cy", function (d) { return y(d.L) + margin.top; })
        .style("fill", "black")
        .style("stroke", "none")
        .style("pointer-events", "all")
        .on("mouseover", function (d) {
            tooltip.transition()
                .duration(200)
                .style("opacity", 0.9);
            tooltip.html(d.L)
                .style("left", (d3.event.pageX) + "px")
                .style("top", (d3.event.pageY - 28) + "px");
        })
        .on("mouseout", function (d) {
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        })
        .append("title")
        .text(function (d) { return "Date: " + d.T; });

    return data;
};

// Callback for brushing on the minimap graph
function brushed() {
    x.domain(brush.empty() ? x2.domain() : brush.extent());
    focus.select("path").attr("d", area);
    focus.select(".x.axis").call(xAxis);
    svg.selectAll("circle").attr("cx", function (d) {
        var cx = x(d.T) + margin.left;
        if (cx < margin.left) {
            cx = -50;
        }
        return cx;
    }).attr("cy", function (d) { return y(d.L) + margin.top; });
};

$(document).ready(function () {

    // Handle the current sensor values, update regularly

    var light = document.querySelector('#light');
    var temp = document.querySelector('#temp');
    var moisture = document.querySelector('#moisture');

    function updateVals(message) {
       light.innerHTML = message.L;
       temp.innerHTML = message.F;
       moisture.innerHTML = message.M;
    };



    pubnub.history({
        channel: 'SVL_TEST1',
        count: 1,
        callback: function (history) {
            if (history[0].length > 0) {
                light.innerHTML = history[0][0].L;
            }
        }
    });

    // Handle the number of users online and update it regularly
    var users = document.querySelector('#users');

    function updateUsers(presence) {
        users.innerHTML = presence.occupancy.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    };

    // Load the past 24 hours of history
    var historyLoader = new HistoryLoader(pubnub, 'SVL_TEST1'),
        oneHour = 1000 * 60 * 60;
    historyLoader.loadHistory((Date.now() - oneHour * 24), oneHour, function (data) {
        console.log("Historical Data:", data);

        graphData = data;
        loadData(graphData);
        updateData(graphData);

        // Subscribe for new data updates
        pubnub.subscribe({
            channel: 'SVL_TEST1',
            callback: function (message) {
                addData(message, graphData);
                graphData = updateData(graphData);

                updateVals(message);

            },
            presence: function (presence) {
                if (updateUsers != null) {
                    updateUsers(presence);
                }
            }
        });
    });
});
