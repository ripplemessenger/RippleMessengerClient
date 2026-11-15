/**
 * @ripplemessenger/protocol - Validator
 *
 * Ajv-backed validation with the exact semantics of the original
 * RippleMessengerServer/msg_validator.js `MsgValidate`:
 *
 *   - Input is a JSON **string**.
 *   - On success it returns the **parsed object** (truthy), not `true`.
 *   - On failure it returns `false`.
 *
 * Returning the parsed object (instead of a boolean) is what every existing
 * caller relies on:
 *
 *     const json = MsgValidate(message);
 *     if (json === false) { terminate(); return; }
 *     if (json.ObjectType) { handleObject(...) }
 *
 * Two APIs are exported:
 *
 *   MsgValidate(strJson)          — drop-in replacement, string in / object|false out
 *   validateMessage(objOrString)  — boolean in / boolean out (new, friendlier)
 *
 * Both share the same compiled validators, so behaviour cannot drift.
 *
 * @version 0.1.0
 */

import Ajv from 'ajv';
import { ActionSchemas, ObjectSchemas, ServerNotifySchemas } from './schema.js';
import { ActionCode } from './constants.js';

const ajv = new Ajv({ allErrors: true });

// Compile once at module load. Keys are stringified numeric codes.
const compiledAction = Object.fromEntries(
  Object.entries(ActionSchemas).map(([code, schema]) => [code, ajv.compile(schema)])
);
const compiledObject = Object.fromEntries(
  Object.entries(ObjectSchemas).map(([type, schema]) => [type, ajv.compile(schema)])
);
const compiledNotify = Object.fromEntries(
  Object.entries(ServerNotifySchemas).map(([code, schema]) => [code, ajv.compile(schema)])
);

/**
 * Run one compiled validator, returning the input on success.
 * @param {Function} validate - compiled Ajv validator
 * @param {object} json - parsed message
 * @returns {object|false}
 */
function run(validate, json) {
  try {
    if (validate(json)) return json;
    return false;
  } catch {
    return false;
  }
}

/**
 * Validate a parsed message and return it, or false.
 * Dispatch follows the original order: `Action` first, then `ObjectType`.
 *
 * @param {object} json - parsed message
 * @returns {object|false} the same object on success, `false` on failure
 */
export function validateParsed(json) {
  if (!json || typeof json !== 'object') return false;

  // NOTE: original uses truthiness (`if (json.Action)`), so Action: 0 would be
  // treated as absent. All real codes are >= 100, so behaviour is identical.
  if (json.Action) {
    const validate = compiledAction[json.Action];
    if (!validate) return false;
    return run(validate, json);
  }

  if (json.ObjectType) {
    const validate = compiledObject[json.ObjectType];
    if (!validate) return false;
    return run(validate, json);
  }

  // ServerNotify (ActionCode 800) and ClientAck (ActionCode 810)
  if (json.ActionCode) {
    if (json.ActionCode === ActionCode.ServerNotify) {
      const validate = compiledNotify[json.MessageCode];
      if (!validate) return false;
      return run(validate, json);
    }
    const validate = compiledAction[json.ActionCode];
    if (!validate) return false;
    return run(validate, json);
  }

  return false;
}

/**
 * Drop-in replacement for the server's `MsgValidate`.
 *
 * @param {string} strJson - raw WebSocket text frame
 * @returns {object|false} parsed + validated object, or `false`
 */
export function MsgValidate(strJson) {
  let json;
  try {
    json = JSON.parse(strJson);
  } catch {
    return false;
  }
  return validateParsed(json);
}

/**
 * Boolean-returning validation, for call sites that don't need the object.
 *
 * @param {string|object} message - JSON string or parsed object
 * @returns {boolean}
 */
export function validateMessage(message) {
  if (typeof message === 'string') {
    return MsgValidate(message) !== false;
  }
  return validateParsed(message) !== false;
}

/**
 * Validate an Action message specifically.
 * @param {string|object} message
 * @returns {boolean}
 */
export function validateAction(message) {
  let json = message;
  if (typeof message === 'string') {
    try {
      json = JSON.parse(message);
    } catch {
      return false;
    }
  }
  if (!json || !json.Action) return false;
  const validate = compiledAction[json.Action];
  return validate ? run(validate, json) !== false : false;
}

/**
 * Validate an ObjectType message specifically.
 * @param {string|object} message
 * @returns {boolean}
 */
export function validateObject(message) {
  let json = message;
  if (typeof message === 'string') {
    try {
      json = JSON.parse(message);
    } catch {
      return false;
    }
  }
  if (!json || !json.ObjectType) return false;
  const validate = compiledObject[json.ObjectType];
  return validate ? run(validate, json) !== false : false;
}

/**
 * Last validation errors (Ajv mutates `.errors` on the failing validator).
 * Best-effort diagnostic helper — the exact validator that failed is tracked
 * per-call inside `run`, so prefer `validateParsed` + a local check if you need
 * precise errors. Kept for parity with the old client-side helper.
 *
 * @param {number} code - ActionCode or ObjectType value
 * @param {'action'|'object'} kind
 * @returns {array} Ajv error objects (possibly empty)
 */
export function getErrors(code, kind = 'action') {
  const table = kind === 'object' ? compiledObject : compiledAction;
  const validate = table[code];
  return validate && validate.errors ? validate.errors : [];
}

export default {
  MsgValidate,
  validateMessage,
  validateAction,
  validateObject,
  validateParsed,
  getErrors
};
