// Acme namespace
var ACME = ACME || {};

ACME.dateRange = {startDate:moment().subtract(7,'days').valueOf(), endDate:moment().endOf('day').valueOf(), intervalType:"days"};

ACME.apiList = new Array();

ACME.apiName = "ALL";

ACME.init = function(){

  gadgets.HubSettings.onConnect = function () {
      gadgets.Hub.subscribe("sdf.dateRange", function (topic, data) {
          ACME.dateRange.startDate = data.startDate.valueOf();
          ACME.dateRange.endDate = data.endDate.valueOf();

          var duration = moment.duration(data.endDate - data.startDate).asDays();

          if(duration > 30){
            ACME.dateRange.intervalType = "weeks";
          }else if(duration >= 3){
            ACME.dateRange.intervalType = "days";
          }else{
            ACME.dateRange.intervalType = "hours";
          }

          ACME.fetchData();

          console.log("Start date : " + data.startDate + " End date : " + data.endDate);
      });
  };
}

ACME.fetchData = function () {
     //if previous operation is not completed, DO NOT fetch data
    if(!dataLoaded) {
        console.log("Waiting for data...");
        return;
    }
    var timeFrom = "undefined"
    var timeTo = "undefined"
    var count = "undefined";
    var request = {
        type: 8,
        tableName: ACME.getDataSouce(),
        filter:filter,
        timeFrom: timeFrom,
        timeTo: timeTo,
        start: 0,
        count: count
    };
    $.ajax({
        url: "/portal/apis/analytics",
        method: "GET",
        data: request,
        contentType: "application/json",
        success: function(data) {
          ACME.processFetchedData(data);
        }
    });
    dataLoaded=false;   //setting the latch to locked position so that we block data fetching until we receive the response from backend
};

ACME.processFetchedData = function(data){
  var rows = makeRows(JSON.parse(data.message));
  ACME.updateAPIList(rows);
  ACME.dataTranformer = new ACME.DataTranformer(rows);
  ACME.drawChart();
}

ACME.updateAPIList = function(rows){

  var apis = d3.nest()
  .key(function(d) {
    return d[1] + ":" + d[2];
    })
  .rollup(function(v) {
    return v[0][1];
    })
  .entries(rows);

  $('#api-list').empty();

  $('#api-list').append('<option value="ALL">All</option>');
  for(var i = 0; i < apis.length; i++){
    $('#api-list').append('<option value="' + apis[i].key + '">' + apis[i].key + '</option>');
  }

}

ACME.drawChart = function () {

    var dataTable = ACME.makeDataTable();

    gadgetConfig.chartConfig.width = $("#placeholder").width();
    gadgetConfig.chartConfig.height = $("#placeholder").height() - 65;
    var chartType = gadgetConfig.chartConfig.chartType;
    var xAxis = gadgetConfig.chartConfig.xAxis;
    jQuery("#noChart").html("");
    if (chartType === "bar" && dataTable.metadata.types[xAxis] === "N") {
        dataTable.metadata.types[xAxis] = "C";
    }

    if(gadgetConfig.chartConfig.chartType==="tabular" || gadgetConfig.chartConfig.chartType==="singleNumber") {
        gadgetConfig.chartConfig.height = $("#placeholder").height();
        var chart = igviz.draw("#placeholder", gadgetConfig.chartConfig, dataTable);
        chart.plot(dataTable.data);

    } else if (gadgetConfig.chartConfig.chartType==="map") {
        $("#placeholder").empty();
        gadgetConfig.chartConfig.width = $("#placeholder").width();
        gadgetConfig.chartConfig.height = $("#placeholder").height() + 20;
        var chart = igviz.draw("#placeholder", gadgetConfig.chartConfig, dataTable);
        chart.plot(dataTable.data);
    } else {
        var chart = igviz.setUp("#placeholder", gadgetConfig.chartConfig, dataTable);
        chart.setXAxis({
            "labelAngle": -35,
            "labelAlign": "right",
            "labelDy": 0,
            "labelDx": 0,
            "titleDy": 25
        })
            .setYAxis({
                "titleDy": -30
            })
        chart.plot(dataTable.data);
    }
    //releasing the latch so that we can request data again from the backend.
    dataLoaded=true;
};

// This function is a decorator to minimize the changes to DAS dashboard code.
ACME.makeDataTable = function(){
  var transformedData = ACME.dataTranformer.transform();
  return makeDataTable(transformedData);
}

ACME.getDataSouce = function(){

  var dataSources = {"hours":"ACME_API_REQUEST_HOURLY_SUMMARY",
                      "days":"ACME_API_REQUEST_DAILY_SUMMARY",
                      "weeks":"ACME_API_REQUEST_WEEKLY_SUMMARY"}

  return dataSources[ACME.dateRange.intervalType];

}

ACME.DataTranformer = function(data){
  this.data = data;

  var that = this;

  sortData();

  function sortData(){

    that.data.sort(compare);

    function compare(a,b) {
      if (a[0] < b[0])
        return -1;
      if (a[0] > b[0])
        return 1;
      return 0;
    }

  }

}

ACME.DataTranformer.prototype.transform = function () {

  var transformedData = this.data;

  transformedData = filter();

  transformedData = summarize();

  // Create records for each slot in the range and merge with the actual records.
  transformedData = mergeIntoDateRange();

  transformedData = convertTickValues();

  return transformedData;

  function filter(){

    // Remove the records which are not in between the selected date range,
    // and then the records which don't belong to the selected API.
    var filteredData = transformedData.filter(function(d){
      return d[0] >= ACME.dateRange.startDate && d[0] <= ACME.dateRange.endDate;
    }).filter(function(d){
      if(ACME.apiName == "ALL"){
        return true;
      }else{
        return ACME.apiName == d[1] + ":" + d[2];
      }
    });

    return filteredData;

  }

  function summarize(){

    var summary;

    if(ACME.apiName == "ALL"){
      summary = d3.nest()
      .key(function(d) {
        return d[0];
        })
      .rollup(function(v) {
        return [v[0][0], "", "", d3.sum(v, function(d){return d[3]})];
       })
      .entries(transformedData);
    }else{
      summary = d3.nest()
      .key(function(d) {
        return d[1] + ":" + d[2] + ":" + d[0];
      })
      .rollup(function(v) {
        return [v[0][0], "", "", d3.sum(v, function(d){return d[3]})];
       })
      .entries(transformedData);
    }

    var summarizedData = summary.map(function(d){
      return d.values;
    });

    return summarizedData;

  }

  function mergeIntoDateRange(){

    var slots = new Array();

    var gap = moment.duration(1, ACME.dateRange.intervalType).asMilliseconds();

    for(var i = ACME.dateRange.startDate; i <= ACME.dateRange.endDate; i += gap){
      slots.push(getRecord(i));
    }

    return slots;

    function getRecord(time){

      var record = [time, "", "", 0];

      for(var i = 0; i < transformedData.length; i++){
        if(time == transformedData[i][0]){
          record = transformedData[i];
        }
      }

      return record;
    }

  }

  function convertTickValues(){

    var formattedData = transformedData.map(function(d){

      var formattedTimeSlot;

      if(ACME.dateRange.intervalType == "hours"){
        formattedTimeSlot = moment(d[0]).format("D/M, hA");
      }else if(ACME.dateRange.intervalType == "days"){
        formattedTimeSlot = moment(d[0]).format("D/M/YY");
      }else if(ACME.dateRange.intervalType == "weeks"){
        formattedTimeSlot = moment(d[0]).format("D/M/YY") + " - " + moment(d[0]).add(1, 'weeks').format("D/M/YY");
      }

      d[0] = formattedTimeSlot;
      return d;
    });

    return formattedData;

  }

};

ACME.init();

$(document).ready(function() {

  var apiListDropdown = $("#api-list").select2({
    data : ACME.apiList
  });

  apiListDropdown.on("change", function (e) {
    ACME.apiName = $('#api-list').val();
    ACME.drawChart();
  });

});
