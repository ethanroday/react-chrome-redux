import {
  DISPATCH_TYPE,
  STATE_TYPE,
  PATCH_STATE_TYPE,
  CONNECT_TYPE
} from '../constants';
import { withSerializer, withDeserializer, noop } from "../serialization";

import shallowDiff from '../strategies/shallowDiff/diff';

/**
 * Responder for promisified results
 * @param  {object} dispatchResult The result from `store.dispatch()`
 * @param  {function} send         The function used to respond to original message
 * @return {undefined}
 */
const promiseResponder = (dispatchResult, send) => {
  Promise
    .resolve(dispatchResult)
    .then((res) => {
      send({
        error: null,
        value: res
      });
    })
    .catch((err) => {
      console.error('error dispatching result:', err);
      send({
        error: err.message,
        value: null
      });
    });
};

/**
 * Wraps a Redux store so that proxy stores can connect to it.
 * @param {Object} store A Redux store
 * @param {Object} options An object of form {portName, dispatchResponder, serializer, deserializer}, where `portName` is a required string and defines the name of the port for state transition changes, `dispatchResponder` is a function that takes the result of a store dispatch and optionally implements custom logic for responding to the original dispatch message,`serializer` is a function to serialize outgoing message payloads (default is passthrough), `deserializer` is a function to deserialize incoming message payloads (default is passthrough), and diffStrategy is one of the included diffing strategies (default is shallow diff) or a custom diffing function.
 */
export default (store, {
  portName,
  dispatchResponder,
  serializer = noop,
  deserializer = noop,
  diffStrategy = shallowDiff,
  allowMessageConnections = false
}) => {
  if (!portName) {
    throw new Error('portName is required in options');
  }
  if (typeof serializer !== 'function') {
    throw new Error('serializer must be a function');
  }
  if (typeof deserializer !== 'function') {
    throw new Error('deserializer must be a function');
  }
  if (typeof diffStrategy !== 'function') {
    throw new Error('diffStrategy must be one of the included diffing strategies or a custom diff function');
  }

  // set dispatch responder as promise responder
  if (!dispatchResponder) {
    dispatchResponder = promiseResponder;
  }

  /**
   * Respond to dispatches from UI components
   */
  const dispatchResponse = (request, sender, sendResponse) => {
    if (request.type === DISPATCH_TYPE && request.portName === portName) {
      const action = Object.assign({}, request.payload, {
        _sender: sender
      });

      let dispatchResult = null;

      try {
        dispatchResult = store.dispatch(action);
      } catch (e) {
        dispatchResult = Promise.reject(e.message);
        console.error(e);
      }

      dispatchResponder(dispatchResult, sendResponse);
      return true;
    }
  };

  /**
  * Setup for state updates
  */
  const connectState = (sendMessageFn, sendResponse) => {

    const serializedMessagePoster = withSerializer(serializer)((...args) => sendMessageFn(...args));

    let prevState = store.getState();

    const patchState = () => {
      const state = store.getState();
      const diff = diffStrategy(prevState, state);

      if (diff.length) {
        prevState = state;

        serializedMessagePoster({
          type: PATCH_STATE_TYPE,
          payload: diff,
        });
      }
    };

    // Send patched state down connected port on every redux store state change
    const unsubscribe = store.subscribe(patchState);


    // Send store's initial state through port
    const initialStateSender = sendResponse || serializedMessagePoster;
    initialStateSender({
      type: STATE_TYPE,
      payload: prevState,
    });
    
    return unsubscribe;
  };

  const withPayloadDeserializer = withDeserializer(deserializer);
  const shouldDeserialize = (request) => request.type === DISPATCH_TYPE && request.portName === portName;

  /**
   * Setup action handler
   */
  withPayloadDeserializer((...args) => chrome.runtime.onMessage.addListener(...args))(dispatchResponse, shouldDeserialize);

  
  const connectFromPort = (port) => {
    if (port.name !== portName) {
      return;
    }

    const unsubscribe = connectState(port.postMessage);

    // when the port disconnects, unsubscribe the sendState listener
    port.onDisconnect.addListener(unsubscribe);

  }
  chrome.runtime.onConnect.addListener(connectFromPort);

  if (allowMessageConnections) {
    const connectFromMessage = (message, sender, sendResponse) => {
      if (message.type === CONNECT_TYPE) {
        connectState(chrome.runtime.sendMessage, sendResponse);
      }
    }
    chrome.runtime.onMessage.addListener(connectFromMessage); 
  }
};
