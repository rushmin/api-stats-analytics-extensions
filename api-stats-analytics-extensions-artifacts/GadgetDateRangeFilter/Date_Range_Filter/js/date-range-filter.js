/*
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
 */
var startDate;
var endDate;

$(document).ready(function () {

 $('#stat-range').daterangepicker({
     ranges: {
        'Today': [moment(), moment()],
        'Yesterday': [moment().subtract(1, 'days'), moment().subtract(1, 'days')],
        'Last 7 Days': [moment().subtract(6, 'days'), moment()],
        'Last 30 Days': [moment().subtract(29, 'days'), moment()],
        'This Month': [moment().startOf('month'), moment().endOf('month')],
        'Last Month': [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')]
     }
 });

 $('#stat-range').on('apply.daterangepicker', handleDateChange);

 init();


});

gadgets.HubSettings.onConnect = function () {
  startDate = moment().subtract(7, 'days');
  endDate = moment();
  publish();
};

function init(){
  startDate = moment().subtract(7, 'days');
  endDate = moment();
  updateLabel(startDate, endDate);
}

function handleDateChange(event, picker){
  updateLabel(picker.startDate, picker.endDate);
  startDate  = picker.startDate;
  endDate = picker.endDate;
  publish();
}

function updateLabel(start, end){
  $('#stat-range span').html(start.format('MMMM D, YYYY') + ' - ' + end.format('MMMM D, YYYY'));
}

function publish() {
    var data = {startDate: startDate, endDate: endDate};
    gadgets.Hub.publish("sdf.dateRange", data);
    console.log("Publishing filter values: " + JSON.stringify(data));
}
