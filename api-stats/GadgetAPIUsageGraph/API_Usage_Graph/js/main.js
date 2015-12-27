var dataLoaded = true;

// Acme namespace
var ACME = ACME || {};

ACME.dateRange = {startDate:moment().subtract(7,'days').valueOf(), endDate:moment().endOf('day').valueOf(), intervalType:"days"};

ACME.apiList = new Array();

ACME.selectedAPI = "OVERALL";

ACME.setDateRange = function (startDate, endDate) {

    ACME.dateRange.startDate = startDate.valueOf();
    ACME.dateRange.endDate = endDate.valueOf();

    var duration = moment.duration(endDate - startDate).asDays();

    if(duration > 30){
      ACME.dateRange.intervalType = "weeks";
    }else if(duration >= 3){
      ACME.dateRange.intervalType = "days";
    }else{
      ACME.dateRange.intervalType = "hours";
    }

    ACME.fetchData();

};

ACME.fetchData = function () {
     //if previous operation is not completed, DO NOT fetch data
    if(!dataLoaded) {
        console.log("Waiting for data...");
        return;
    }
    var timeFrom = "undefined"
    var timeTo = "undefined"
    var count = "undefined";
    var filter = "undefined";

    var request = {
        type: 8,
        tableName: ACME.getDataSouce(),
        filter: filter,
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
  var rows = ACME.makeRows(JSON.parse(data.message));
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

  $('#apiList').empty();

  $('#apiList').append('<option value="ALL">ALL</option>');
  $('#apiList').append('<option value="OVERALL">OVERALL</option>');

  ACME.apiList = new Array();

  for(var i = 0; i < apis.length; i++){
    ACME.apiList.push(apis[i].key);
    $('#apiList').append('<option value="' + apis[i].key + '">' + apis[i].key + '</option>');
  }

}

ACME.makeRows = function(data) {

    var columns = gadgetConfig.columns;

    var rows = [];
    for (var i = 0; i < data.length; i++) {
        var record = data[i];
        var keys = Object.getOwnPropertyNames(record.values);
        var row = columns.map(function(column, i) {
            return record.values[column.name];
        });
        rows.push(row);
    };
    return rows;
};

ACME.drawChart = function() {

    var dataTable = ACME.makeDataTable();

    jQuery("#noChart").html("");

    var chart = igviz.setUp("#placeholder", ACME.getChartConfig(), dataTable);

    chart.setXAxis({
          "labelAngle": -35,
          "labelAlign": "right",
          "labelDy": 0,
          "labelDx": 0,
          "titleDy": 25
        })
        .setYAxis({
          "titleDy": -30
        });

    chart.plot(dataTable.data);

    //releasing the latch so that we can request data again from the backend.
    dataLoaded=true;
};

ACME.getChartConfig = function(){

  var config = {
                 "chartType": "line",
                 "xAxis": 0,
                 "yAxis": [1],
                 "interpolationMode":"line"
               };

  config.width = $("#placeholder").width();
  config.height = $("#placeholder").height() - 65;

  if(ACME.selectedAPI == "ALL"){
    config.yAxis = new Array(ACME.apiList.length).fill(0).map(function(value, i){return i+1})
  }

  return config;

}

// This function is a decorator to minimize the changes to DAS dashboard code.
ACME.makeDataTable = function(){

  var columns = ACME.defineColumns();
  var data = ACME.dataTranformer.transform();

  var dataTable = new igviz.DataTable();
  if (columns.length > 0) {
      columns.forEach(function(column, i) {
          var type = "N";
          if (column.type == "STRING" || column.type == "string") {
              type = "C";
          } else if (column.type == "TIME" || column.type == "time") {
              type = "T";
          }
          dataTable.addColumn(column.name, type);
      });
  }
  data.forEach(function(row, index) {
      for (var i = 0; i < row.length; i++) {
          if (columns[i].type == "FLOAT" || columns[i].type == "DOUBLE") {
              row[i] = parseFloat(row[i]);
          } else if (columns[i].type == "INTEGER" || columns[i].type == "LONG") {
              row[i] = parseInt(row[i]);
          }
      }
  });
  dataTable.addRows(data);
  return dataTable;

}

ACME.defineColumns = function(){

  var columns = [{"name": "timeslot","type": "STRING"},
                 {"name": "count","type": "INTEGER"}];

  if(ACME.selectedAPI == "ALL"){
    columns.splice(1,1);

    for(var i = 0; i < ACME.apiList.length; i++){
      columns.push({"name":ACME.apiList[i], "type":"INTEGER"})
    }

  }

  return columns;

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
      if(ACME.selectedAPI == "OVERALL" || ACME.selectedAPI == "ALL"){
        return true;
      }else{
        return ACME.selectedAPI == d[1] + ":" + d[2];
      }
    });

    return filteredData;

  }

  function summarize(){

    var summary;

    if(ACME.selectedAPI == "OVERALL"){
      summary = d3.nest()
      .key(function(d) {
        return d[0];
        })
      .rollup(function(v) {
        return [v[0][0], d3.sum(v, function(d){return d[3]})];
       })
      .entries(transformedData);
    }else if(ACME.selectedAPI == "ALL"){
      summary = d3.nest()
      .key(function(d) {
        return d[0];
      })
      .rollup(function(v) {

        var summary = d3.nest()
                      .key(function(d) {
                        return d[1] + ":" + d[2];
                      })
                      .rollup(function(v){
                        return  d3.sum(v, function(d){return d[3]});
                      })
                      .entries(v);

        var restructedSummary = new Array();

        //  Timeslot field.
        restructedSummary[0] = v[0][0];

        for(var i = 0; i < ACME.apiList.length; i++){
          var count = 0;
          for(var j = 0; j < summary.length; j++){
            if(ACME.apiList[i] == summary[j].key){
              count = summary[j].values;
            }
          }
          restructedSummary.push(count);
        }

        return restructedSummary;
       })
      .entries(transformedData);
    }else{
      summary = d3.nest()
      .key(function(d) {
        return d[1] + ":" + d[2] + ":" + d[0];
      })
      .rollup(function(v) {
        return [v[0][0], d3.sum(v, function(d){return d[3]})];
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

      // Create a dummy records based on the selected APIs count.
      var record = [time, 0];

      if(ACME.selectedAPI == "ALL"){
        record = [time].concat(new Array(ACME.apiList.length).fill(0));
      }

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

$(document).ready(function() {

  $('#apiList').on("change", function (e) {
    ACME.selectedAPI = $('#apiList').val();
    ACME.drawChart();
  });

  $('#dateRange').daterangepicker({
      opens: "right",
      ranges: {
         'Today': [moment(), moment()],
         'Yesterday': [moment().subtract(1, 'days'), moment().subtract(1, 'days')],
         'Last 7 Days': [moment().subtract(6, 'days'), moment()],
         'Last 30 Days': [moment().subtract(29, 'days'), moment()],
         'This Month': [moment().startOf('month'), moment().endOf('month')],
         'Last Month': [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')]
      }
  });

  $('#dateRange').on('apply.daterangepicker', handleDateChange);

  function handleDateChange(event, picker){
    updateLabel(picker.startDate, picker.endDate);
    ACME.setDateRange(picker.startDate, picker.endDate);
  }

  function updateLabel(start, end){
    $('#dateRange span').html(start.format('MMMM D, YYYY') + ' - ' + end.format('MMMM D, YYYY'));
  }


});
