package org.wso2.analytics.siddhi;

import org.wso2.siddhi.core.config.ExecutionPlanContext;
import org.wso2.siddhi.core.event.ComplexEvent;
import org.wso2.siddhi.core.event.ComplexEventChunk;
import org.wso2.siddhi.core.event.MetaComplexEvent;
import org.wso2.siddhi.core.event.stream.StreamEvent;
import org.wso2.siddhi.core.event.stream.StreamEventCloner;
import org.wso2.siddhi.core.executor.ExpressionExecutor;
import org.wso2.siddhi.core.executor.VariableExpressionExecutor;
import org.wso2.siddhi.core.query.processor.Processor;
import org.wso2.siddhi.core.query.processor.stream.window.FindableProcessor;
import org.wso2.siddhi.core.query.processor.stream.window.WindowProcessor;
import org.wso2.siddhi.core.table.EventTable;
import org.wso2.siddhi.core.util.collection.operator.Finder;
import org.wso2.siddhi.core.util.parser.CollectionOperatorParser;
import org.wso2.siddhi.query.api.expression.Expression;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Created by rushmin on 1/8/16.
 */
public class UniqueTimeWindow extends WindowProcessor implements FindableProcessor {


    private ConcurrentHashMap<String, Long> lastReceivedTimes = new ConcurrentHashMap<String, Long>();
    private VariableExpressionExecutor quietPeriodVariableExpressionExecutor;
    private VariableExpressionExecutor[] uniqueVariableExpressionExecutors;

    /**
     * The init method of the WindowProcessor, this method will be called before other methods
     *
     * @param attributeExpressionExecutors the executors of each function parameters
     * @param executionPlanContext         the context of the execution plan
     */
    @Override
    protected void init(ExpressionExecutor[] attributeExpressionExecutors, ExecutionPlanContext executionPlanContext) {


        quietPeriodVariableExpressionExecutor = (VariableExpressionExecutor) attributeExpressionExecutors[0];

        uniqueVariableExpressionExecutors = new VariableExpressionExecutor[attributeExpressionExecutors.length - 1];
        for (int i = 1; i < attributeExpressionExecutors.length; i++) {
            uniqueVariableExpressionExecutors[i-1] =(VariableExpressionExecutor) attributeExpressionExecutors[i];
        }
    }

    /**
     * The main processing method that will be called upon event arrival
     *
     * @param streamEventChunk  the stream event chunk that need to be processed
     * @param nextProcessor     the next processor to which the success events need to be passed
     * @param streamEventCloner helps to clone the incoming event for local storage or modification
     */
    @Override
    protected synchronized void process(ComplexEventChunk<StreamEvent> streamEventChunk, Processor nextProcessor, StreamEventCloner streamEventCloner) {
        ComplexEventChunk<StreamEvent> complexEventChunk = new ComplexEventChunk<StreamEvent>();

        StreamEvent streamEvent = streamEventChunk.getFirst();
        while (streamEvent != null) {

            StreamEvent next = streamEvent.getNext();

            String eventKey = generateKey(streamEvent);

            //Get the last received time for the event which has the same key.
            Long lastReceivedTime = lastReceivedTimes.get(eventKey);

            if(lastReceivedTime == null ||
                    streamEvent.getTimestamp() - lastReceivedTime.longValue() >
                            (Long)(streamEvent.getAttribute(quietPeriodVariableExpressionExecutor.getPosition()))){
                complexEventChunk.add(streamEvent);
                streamEvent.setNext(null);

                lastReceivedTimes.put(eventKey, streamEvent.getTimestamp());
            }

            streamEvent = next;
        }

        nextProcessor.process(complexEventChunk);
    }

    /**
     * This will be called only once and this can be used to acquire
     * required resources for the processing element.
     * This will be called after initializing the system and before
     * starting to process the events.
     */
    public void start() {
        //Do nothing
    }

    /**
     * This will be called only once and this can be used to release
     * the acquired resources for processing.
     * This will be called before shutting down the system.
     */
    public void stop() {
        //Do nothing
    }

    /**
     * Used to collect the serializable state of the processing element, that need to be
     * persisted for the reconstructing the element to the same state on a different point of time
     *
     * @return stateful objects of the processing element as an array
     */
    public Object[] currentState() {
        return new Object[]{lastReceivedTimes};
    }

    /**
     * Used to restore serialized state of the processing element, for reconstructing
     * the element to the same state as if was on a previous point of time.
     *
     * @param state the stateful objects of the element as an array on
     *              the same order provided by currentState().
     */
    public void restoreState(Object[] state) {
        lastReceivedTimes = (ConcurrentHashMap<String, Long>) state[0];
    }

    /**
     * To find events from the processor event pool, that the matches the matchingEvent based on finder logic.
     *
     * @param matchingEvent the event to be matched with the events at the processor
     * @param finder        the execution element responsible for finding the corresponding events that matches
     *                      the matchingEvent based on pool of events at Processor
     * @return the matched events
     */
    public synchronized StreamEvent find(ComplexEvent matchingEvent, Finder finder) {
        return finder.find(matchingEvent, lastReceivedTimes.values(), streamEventCloner);
    }

    /**
     * To construct a finder having the capability of finding events at the processor that corresponds to the incoming
     * matchingEvent and the given matching expression logic.
     *
     * @param expression                  the matching expression
     * @param metaComplexEvent            the meta structure of the incoming matchingEvent
     * @param executionPlanContext        current execution plan context
     * @param variableExpressionExecutors the list of variable ExpressionExecutors already created
     * @param eventTableMap               map of event tables
     * @param matchingStreamIndex         the stream index of the incoming matchingEvent
     * @param withinTime                  the maximum time gap between the events to be matched
     * @return finder having the capability of finding events at the processor against the expression and incoming
     * matchingEvent
     */
    public Finder constructFinder(Expression expression, MetaComplexEvent metaComplexEvent, ExecutionPlanContext executionPlanContext, List<VariableExpressionExecutor> variableExpressionExecutors, Map<String, EventTable> eventTableMap, int matchingStreamIndex, long withinTime) {
        return CollectionOperatorParser.parse(expression, metaComplexEvent, executionPlanContext, variableExpressionExecutors, eventTableMap, matchingStreamIndex, inputDefinition, withinTime);

    }

    private String generateKey(StreamEvent event) {
        StringBuilder stringBuilder = new StringBuilder();
        for (VariableExpressionExecutor executor : uniqueVariableExpressionExecutors) {
            stringBuilder.append(event.getAttribute(executor.getPosition()));
        }
        return stringBuilder.toString();
    }


}
