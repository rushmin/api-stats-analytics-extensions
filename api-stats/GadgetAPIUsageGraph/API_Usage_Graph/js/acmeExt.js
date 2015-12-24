// Acme namespace
var ACME = ACME || {};

ACME.dateRange = {startDate:moment().subtract(2,'days'), endDate:moment().endOf('day'), intervalType:"hours"};

ACME.init = function(){
  gadgets.HubSettings.onConnect = function () {
      gadgets.Hub.subscribe("sdf.dateRange", function (topic, data) {
          ACME.dateRange.startDate = data.startDate;
          ACME.dateRange.endDate = data.endDate;

          var duration = moment.duration(data.endDate - data.startDate).asDays();

          if(duration > 30){
            ACME.dateRange.intervalType = "weeks";
          }else if(duration >= 3){
            ACME.dateRange.intervalType = "days";
          }else{
            ACME.dateRange.intervalType = "hours";
          }

          console.log("Start date : " + data.startDate + " End date : " + data.endDate);
      });
  };
}

// This function is a decorator to minimize the changes to DAS dashboard code.
ACME.makeDataTable = function(data, dasMakeDataTable){

      var dataTranformer = new ACME.DataTranformer();
      var transformedData = dataTranformer.transform(data);

      return dasMakeDataTable(transformedData);
}

ACME.DataTranformer = function(){
  this.data = {};
}

ACME.DataTranformer.prototype.transform = function (data) {

  var transformedData = data;

  sortData();

  // Expands the range by adding entries for every gap in the range. e.g. even it is missing in the summery table because of 0 values.
  transformedData = expandRange();

  return transformedData;

  function sortData(){

    transformedData.sort(compare);

    function compare(a,b) {
      if (a[0] < b[0])
        return -1;
      if (a[0] > b[0])
        return 1;
      return 0;
    }

  }

  function expandRange(){

    var slots = new Array();

    var gap = moment.duration(1, ACME.dateRange.intervalType).asMilliseconds();

    for(var i = ACME.dateRange.startDate; i <= ACME.dateRange.endDate; i += gap){
      slots.push(getDatum(i));
    }

    return slots;

    function getDatum(time){

      var value = 0;
      for(var i = 0; i < transformedData.length; i++){
        if(time == transformedData[i][0]){
          value = transformedData[i][1];
          break;
        }
      }

      return [moment(time).format("ddd, hA"), value];
    }

  }

};

ACME.init();
