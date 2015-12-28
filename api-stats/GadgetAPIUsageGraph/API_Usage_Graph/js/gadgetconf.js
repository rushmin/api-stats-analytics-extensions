var gadgetConfig = {
  "datasources" : {"hours":"ACME_API_REQUEST_HOURLY_SUMMARY",
                   "days":"ACME_API_REQUEST_DAILY_SUMMARY",
                   "weeks":"ACME_API_REQUEST_WEEKLY_SUMMARY"},
  "columns": [
    {
      "name": "timeslot",
      "type": "STRING"
    },
    {
      "name": "api_name",
      "type": "STRING"
    },
    {
      "name": "api_version",
      "type": "STRING"
    },
    {
      "name": "request_count",
      "type": "INTEGER"
    }
  ],
  "chartConfig": {
    "chartType": "line",
    "yAxis": [1],
    "xAxis": 0,
    "interpolationMode":"line"
  },
  "dateRangePickerConfig" : {"opens": "right",
                             "ranges": {
                                 "Today": [moment(), moment()],
                                 "Yesterday": [moment().subtract(1, 'days'), moment().subtract(1, 'days')],
                                 "Last 7 Days": [moment().subtract(6, 'days'), moment()],
                                 "Last 30 Days": [moment().subtract(29, 'days'), moment()],
                                 "This Month": [moment().startOf('month'), moment().endOf('month')],
                                 "Last Month": [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')]
                              }
                            }
}
