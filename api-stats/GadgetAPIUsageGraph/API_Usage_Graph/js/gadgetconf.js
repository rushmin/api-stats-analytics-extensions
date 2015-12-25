var gadgetConfig = {
  "id": "API_Requests",
  "title": "API Requests",
  "datasource": "ACME_API_REQUEST_DAILY_SUMMARY",
  "type": "batch",
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
  "maxUpdateValue": 0,
  "chartConfig": {
    "chartType": "line",
    "yAxis": [3],
    "xAxis": 0,
    "interpolationMode":"line"
  },
  "domain": "carbon.super"
}
