var gadgetConfig = {
  "id": "API_Requests",
  "title": "API Requests",
  "datasource": "ACME_API_REQUEST_SUMMARY",
  "type": "batch",
  "columns": [
    {
      "name": "hour",
      "type": "STRING"
    },
    {
      "name": "request_count",
      "type": "INTEGER"
    }
  ],
  "maxUpdateValue": 0,
  "chartConfig": {
    "chartType": "bar",
    "yAxis": 1,
    "xAxis": 0,
  },
  "domain": "carbon.super"
}
