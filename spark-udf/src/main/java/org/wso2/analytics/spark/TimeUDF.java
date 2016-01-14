package org.wso2.analytics.spark;

import java.util.Calendar;
import java.util.Date;

/**
 * Created by rushmin on 11/25/15.
 */
public class TimeUDF {


    private static final String HOUR = "HOUR";
    private static final String DATE = "DATE";
    private static final String WEEK = "WEEK";
    private static final String MONTH = "MONTH";

    public String current_timestamp(String nothing){
        return String.valueOf(System.currentTimeMillis());
    }

    public Long roundTimestamp(Long timestamp, String unit){

        Long roundedTimestamp = Long.valueOf(-1);

        if(HOUR.equals(unit)) {
            roundedTimestamp = roundTimestampToHour(timestamp);
        }else if(DATE.equals(unit)){
            roundedTimestamp = roundTimestampToDate(timestamp);
        }else if(WEEK.equals(unit)){
            roundedTimestamp = roundTimestampToWeek(timestamp);
        }else if(MONTH.equals(unit)){
            roundedTimestamp = roundTimestampToMonth(timestamp);
        }

        return roundedTimestamp;

    }

    private Long roundTimestampToHour(Long timestamp) {
        Calendar date = Calendar.getInstance();

        date.setTimeInMillis(timestamp);

        date.set(Calendar.MINUTE, 0);
        date.set(Calendar.SECOND, 0);
        date.set(Calendar.MILLISECOND, 0);

        return date.getTimeInMillis();
    }

    private Long roundTimestampToDate(Long timestamp) {

        Calendar date = Calendar.getInstance();

        date.setTimeInMillis(timestamp);

        date.set(Calendar.HOUR_OF_DAY, 0);
        date.set(Calendar.MINUTE, 0);
        date.set(Calendar.SECOND, 0);
        date.set(Calendar.MILLISECOND, 0);

        return date.getTimeInMillis();
    }

    private Long roundTimestampToWeek(Long timestamp) {

        Calendar date = Calendar.getInstance();

        date.setTimeInMillis(timestamp);

        date.set(Calendar.DAY_OF_WEEK, Calendar.MONDAY);

        date.set(Calendar.HOUR_OF_DAY, 0);
        date.set(Calendar.MINUTE, 0);
        date.set(Calendar.SECOND, 0);
        date.set(Calendar.MILLISECOND, 0);

        return date.getTimeInMillis();
    }

    private Long roundTimestampToMonth(Long timestamp) {

        Calendar date = Calendar.getInstance();

        date.setTimeInMillis(timestamp);

        date.set(Calendar.DAY_OF_MONTH, 1);

        date.set(Calendar.HOUR_OF_DAY, 0);
        date.set(Calendar.MINUTE, 0);
        date.set(Calendar.SECOND, 0);
        date.set(Calendar.MILLISECOND, 0);

        return date.getTimeInMillis();
    }

}
