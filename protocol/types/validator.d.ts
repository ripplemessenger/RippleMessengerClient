/**
 * @ripplemessenger/protocol — validator typings
 */

/** Parsed protocol message. Loosely typed: the exact shape depends on the code. */
export type ProtocolMessage = Record<string, unknown>;

/**
 * Drop-in replacement for the server's `MsgValidate`.
 *
 * @param strJson raw WebSocket text frame
 * @returns the parsed object on success, `false` on failure
 */
export declare function MsgValidate(strJson: string): ProtocolMessage | false;

/**
 * Validate an already-parsed message, returning it or `false`.
 */
export declare function validateParsed(json: unknown): ProtocolMessage | false;

/**
 * Boolean-returning validation.
 */
export declare function validateMessage(message: string | ProtocolMessage): boolean;

/** Validate specifically as an Action message. */
export declare function validateAction(message: string | ProtocolMessage): boolean;

/** Validate specifically as an ObjectType message. */
export declare function validateObject(message: string | ProtocolMessage): boolean;

/** Best-effort Ajv error list for the last validation of this code. */
export declare function getErrors(code: number, kind?: 'action' | 'object'): unknown[];

declare const _default: {
  MsgValidate: typeof MsgValidate;
  validateMessage: typeof validateMessage;
  validateAction: typeof validateAction;
  validateObject: typeof validateObject;
  validateParsed: typeof validateParsed;
  getErrors: typeof getErrors;
};
export default _default;
