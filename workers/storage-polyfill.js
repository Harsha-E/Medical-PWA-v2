/**
 * @fileoverview localStorage polyfill for Web Workers
 * This must be imported FIRST in the worker so it executes before any modules
 * that depend on localStorage (like AccuracyTracker and RecognitionHistory).
 */
if (typeof self.localStorage === 'undefined') {
  self.localStorage = {
    _data: {},
    setItem: function(id, val) { this._data[id] = String(val); },
    getItem: function(id) { return this._data.hasOwnProperty(id) ? this._data[id] : null; },
    removeItem: function(id) { delete this._data[id]; },
    clear: function() { this._data = {}; }
  };
}
