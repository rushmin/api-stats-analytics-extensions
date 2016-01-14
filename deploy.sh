mvn clean install
cp siddhi-extensions/target/siddhi-extensions-1.0.0-SNAPSHOT.jar ~/symlinks/das/repository/components/lib/
cp spark-udf/target/spark-udf-1.0.0-SNAPSHOT.jar ~/symlinks/das/repository/components/lib/
cp -r carbon-conf/* ~/symlinks/das/repository/conf
cp api-stats-analytics-extensions-car/target/api-stats-analytics-extensions.car ~/symlinks/das/repository/deployment/server/carbonapps/
