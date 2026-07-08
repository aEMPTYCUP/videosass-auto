/**
 * Monad Types - Option and Result monads for robust error handling
 * Based on VDP core.js monad pattern
 */

/**
 * @template T
 * @typedef {{ tag: 'some', value: T }} Some
 */

/**
 * @typedef {{ tag: 'none' }} None
 */

/**
 * @template T
 * @typedef {Some<T> | None} OptionType
 */

/**
 * @template T, E
 * @typedef {{ tag: 'ok', value: T }} Ok
 */

/**
 * @template E
 * @typedef {{ tag: 'err', error: E }} Err
 */

/**
 * @template T, E
 * @typedef {Ok<T, E> | Err<E>} ResultType
 */

/**
 * Option monad - represents a value that may or may not exist
 * @template T
 */
class Option {
  /**
   * @private
   * @param {OptionType<T>} value
   */
  constructor(value) {
    this._value = value;
  }

  /**
   * Check if Option is Some
   * @returns {boolean}
   */
  isSome() {
    return this._value.tag === 'some';
  }

  /**
   * Check if Option is None
   * @returns {boolean}
   */
  isNone() {
    return this._value.tag === 'none';
  }

  /**
   * Get the value (throws if None)
   * @returns {T}
   */
  get value() {
    if (this._value.tag === 'none') {
      throw new Error('Cannot get value of None');
    }
    return this._value.value;
  }

  /**
   * Get the raw underlying value (or undefined if None)
   * @returns {T | undefined}
   */
  get raw() {
    return this._value.tag === 'some' ? this._value.value : undefined;
  }

  /**
   * Map the value if Some, otherwise return None
   * @template U
   * @param {(value: T) => U} fn
   * @returns {Option<U>}
   */
  map(fn) {
    if (this._value.tag === 'some') {
      return Option.some(fn(this._value.value));
    }
    return Option.none();
  }

  /**
   * Chain operation that returns another Option
   * @template U
   * @param {(value: T) => Option<U>} fn
   * @returns {Option<U>}
   */
  andThen(fn) {
    if (this._value.tag === 'some') {
      return fn(this._value.value);
    }
    return Option.none();
  }

  /**
   * Chain operation that returns another Option (alias for andThen)
   * @template U
   * @param {(value: T) => Option<U>} fn
   * @returns {Option<U>}
   */
  chain(fn) {
    return this.andThen(fn);
  }

  /**
   * Return this Option if Some, otherwise return the alternative
   * @param {Option<T>} alternative
   * @returns {Option<T>}
   */
  or(alternative) {
    if (this._value.tag === 'some') {
      return this;
    }
    return alternative;
  }

  /**
   * Return this Option if Some, otherwise call fn to get alternative
   * @param {() => Option<T>} fn
   * @returns {Option<T>}
   */
  orElse(fn) {
    if (this._value.tag === 'some') {
      return this;
    }
    return fn();
  }

  /**
   * Get value or return default
   * @param {T} defaultValue
   * @returns {T}
   */
  unwrapOr(defaultValue) {
    return this._value.tag === 'some' ? this._value.value : defaultValue;
  }

  /**
   * Get value or call fn to get default
   * @param {() => T} fn
   * @returns {T}
   */
  unwrapOrElse(fn) {
    return this._value.tag === 'some' ? this._value.value : fn();
  }

  /**
   * Pattern match on the Option
   * @template U, V
   * @param {{ some: (value: T) => U, none: () => V }} patterns
   * @returns {U | V}
   */
  match(patterns) {
    if (this._value.tag === 'some') {
      return patterns.some(this._value.value);
    }
    return patterns.none();
  }

  /**
   * Convert to Result
   * @template E
   * @param {E} error
   * @returns {ResultType<T, E>}
   */
  toResult(error) {
    if (this._value.tag === 'some') {
      return Result.ok(this._value.value);
    }
    return Result.err(error);
  }

  /**
   * Create a Some Option
   * @template T
   * @param {T} value
   * @returns {Option<T>}
   */
  static some(value) {
    return new Option({ tag: 'some', value });
  }

  /**
   * Create a None Option
   * @template T
   * @returns {Option<T>}
   */
  static none() {
    return new Option({ tag: 'none' });
  }

  /**
   * Create Option from nullable value
   * @template T
   * @param {T | null | undefined} value
   * @returns {Option<T>}
   */
  static from(value) {
    if (value === null || value === undefined) {
      return Option.none();
    }
    return Option.some(value);
  }
}

/**
 * Result monad - represents either a success (Ok) or a failure (Err)
 * @template T, E
 */
class Result {
  /**
   * @private
   * @param {ResultType<T, E>} value
   */
  constructor(value) {
    this._value = value;
  }

  /**
   * Check if Result is Ok
   * @returns {boolean}
   */
  isOk() {
    return this._value.tag === 'ok';
  }

  /**
   * Check if Result is Err
   * @returns {boolean}
   */
  isErr() {
    return this._value.tag === 'err';
  }

  /**
   * Get the Ok value (throws if Err)
   * @returns {T}
   */
  get value() {
    if (this._value.tag === 'err') {
      throw new Error('Cannot get value of Err');
    }
    return this._value.value;
  }

  /**
   * Get the error value (throws if Ok)
   * @returns {E}
   */
  get error() {
    if (this._value.tag === 'ok') {
      throw new Error('Cannot get error of Ok');
    }
    return this._value.error;
  }

  /**
   * Map the Ok value, leave Err unchanged
   * @template U
   * @param {(value: T) => U} fn
   * @returns {Result<U, E>}
   */
  map(fn) {
    if (this._value.tag === 'ok') {
      return Result.ok(fn(this._value.value));
    }
    return Result.err(this._value.error);
  }

  /**
   * Map the Err value, leave Ok unchanged
   * @template F
   * @param {(error: E) => F} fn
   * @returns {Result<T, F>}
   */
  mapErr(fn) {
    if (this._value.tag === 'err') {
      return Result.err(fn(this._value.error));
    }
    return Result.ok(this._value.value);
  }

  /**
   * Chain operation that returns another Result
   * @template U
   * @param {(value: T) => Result<U, E>} fn
   * @returns {Result<U, E>}
   */
  andThen(fn) {
    if (this._value.tag === 'ok') {
      return fn(this._value.value);
    }
    return Result.err(this._value.error);
  }

  /**
   * Chain operation that returns another Result (alias for andThen)
   * @template U
   * @param {(value: T) => Result<U, E>} fn
   * @returns {Result<U, E>}
   */
  chain(fn) {
    return this.andThen(fn);
  }

  /**
   * Return this Result if Ok, otherwise return alternative
   * @param {Result<T, E>} alternative
   * @returns {Result<T, E>}
   */
  or(alternative) {
    if (this._value.tag === 'ok') {
      return this;
    }
    return alternative;
  }

  /**
   * Return this Result if Ok, otherwise call fn to get alternative
   * @param {() => Result<T, E>} fn
   * @returns {Result<T, E>}
   */
  orElse(fn) {
    if (this._value.tag === 'ok') {
      return this;
    }
    return fn();
  }

  /**
   * Get value or return default
   * @param {T} defaultValue
   * @returns {T}
   */
  unwrapOr(defaultValue) {
    return this._value.tag === 'ok' ? this._value.value : defaultValue;
  }

  /**
   * Get value or call fn to get default
   * @param {(error: E) => T} fn
   * @returns {T}
   */
  unwrapOrElse(fn) {
    return this._value.tag === 'ok' ? this._value.value : fn(this._value.error);
  }

  /**
   * Get value or throw the error
   * @returns {T}
   */
  unwrap() {
    if (this._value.tag === 'err') {
      throw this._value.error instanceof Error
        ? this._value.error
        : new Error(String(this._value.error));
    }
    return this._value.value;
  }

  /**
   * Pattern match on the Result
   * @template U, V
   * @param {{ ok: (value: T) => U, err: (error: E) => V }} patterns
   * @returns {U | V}
   */
  match(patterns) {
    if (this._value.tag === 'ok') {
      return patterns.ok(this._value.value);
    }
    return patterns.err(this._value.error);
  }

  /**
   * Convert to Option (discarding the error)
   * @returns {Option<T>}
   */
  toOption() {
    if (this._value.tag === 'ok') {
      return Option.some(this._value.value);
    }
    return Option.none();
  }

  /**
   * Create an Ok Result
   * @template T, E
   * @param {T} value
   * @returns {Result<T, E>}
   */
  static ok(value) {
    return new Result({ tag: 'ok', value });
  }

  /**
   * Create an Err Result
   * @template T, E
   * @param {E} error
   * @returns {Result<T, E>}
   */
  static err(error) {
    return new Result({ tag: 'err', error });
  }

  /**
   * Wrap a function that may throw into a Result
   * @template T
   * @param {() => T} fn
   * @returns {Result<T, Error>}
   */
  static try(fn) {
    try {
      return Result.ok(fn());
    } catch (error) {
      return Result.err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Wrap an async function that may reject into a Result
   * @template T
   * @param {() => Promise<T>} fn
   * @returns {Promise<Result<T, Error>>}
   */
  static async tryAsync(fn) {
    try {
      const value = await fn();
      return Result.ok(value);
    } catch (error) {
      return Result.err(error instanceof Error ? error : new Error(String(error)));
    }
  }
}

module.exports = { Option, Result };
