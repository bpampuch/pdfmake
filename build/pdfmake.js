!function(e){if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.pdfMake=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
/**
 * The buffer module from node.js, for the browser.
 *
 * Author:   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * License:  MIT
 *
 * `npm install buffer`
 */

var base64 = _dereq_('base64-js')
var ieee754 = _dereq_('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = Buffer
exports.INSPECT_MAX_BYTES = 50
Buffer.poolSize = 8192

/**
 * If `Buffer._useTypedArrays`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (compatible down to IE6)
 */
Buffer._useTypedArrays = (function () {
   // Detect if browser supports Typed Arrays. Supported browsers are IE 10+,
   // Firefox 4+, Chrome 7+, Safari 5.1+, Opera 11.6+, iOS 4.2+.
  if (typeof Uint8Array !== 'function' || typeof ArrayBuffer !== 'function')
    return false

  // Does the browser support adding properties to `Uint8Array` instances? If
  // not, then that's the same as no `Uint8Array` support. We need to be able to
  // add all the node Buffer API methods.
  // Bug in Firefox 4-29, now fixed: https://bugzilla.mozilla.org/show_bug.cgi?id=695438
  try {
    var arr = new Uint8Array(0)
    arr.foo = function () { return 42 }
    return 42 === arr.foo() &&
        typeof arr.subarray === 'function' // Chrome 9-10 lack `subarray`
  } catch (e) {
    return false
  }
})()

/**
 * Class: Buffer
 * =============
 *
 * The Buffer constructor returns instances of `Uint8Array` that are augmented
 * with function properties for all the node `Buffer` API functions. We use
 * `Uint8Array` so that square bracket notation works as expected -- it returns
 * a single octet.
 *
 * By augmenting the instances, we can avoid modifying the `Uint8Array`
 * prototype.
 */
function Buffer (subject, encoding, noZero) {
  if (!(this instanceof Buffer))
    return new Buffer(subject, encoding, noZero)

  var type = typeof subject

  // Workaround: node's base64 implementation allows for non-padded strings
  // while base64-js does not.
  if (encoding === 'base64' && type === 'string') {
    subject = stringtrim(subject)
    while (subject.length % 4 !== 0) {
      subject = subject + '='
    }
  }

  // Find the length
  var length
  if (type === 'number')
    length = coerce(subject)
  else if (type === 'string')
    length = Buffer.byteLength(subject, encoding)
  else if (type === 'object')
    length = coerce(subject.length) // Assume object is an array
  else
    throw new Error('First argument needs to be a number, array or string.')

  var buf
  if (Buffer._useTypedArrays) {
    // Preferred: Return an augmented `Uint8Array` instance for best performance
    buf = augment(new Uint8Array(length))
  } else {
    // Fallback: Return THIS instance of Buffer (created by `new`)
    buf = this
    buf.length = length
    buf._isBuffer = true
  }

  var i
  if (Buffer._useTypedArrays && typeof Uint8Array === 'function' &&
      subject instanceof Uint8Array) {
    // Speed optimization -- use set if we're copying from a Uint8Array
    buf._set(subject)
  } else if (isArrayish(subject)) {
    // Treat array-ish objects as a byte array
    for (i = 0; i < length; i++) {
      if (Buffer.isBuffer(subject))
        buf[i] = subject.readUInt8(i)
      else
        buf[i] = subject[i]
    }
  } else if (type === 'string') {
    buf.write(subject, 0, encoding)
  } else if (type === 'number' && !Buffer._useTypedArrays && !noZero) {
    for (i = 0; i < length; i++) {
      buf[i] = 0
    }
  }

  return buf
}

// STATIC METHODS
// ==============

Buffer.isEncoding = function (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'binary':
    case 'base64':
    case 'raw':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.isBuffer = function (b) {
  return !!(b !== null && b !== undefined && b._isBuffer)
}

Buffer.byteLength = function (str, encoding) {
  var ret
  str = str + ''
  switch (encoding || 'utf8') {
    case 'hex':
      ret = str.length / 2
      break
    case 'utf8':
    case 'utf-8':
      ret = utf8ToBytes(str).length
      break
    case 'ascii':
    case 'binary':
    case 'raw':
      ret = str.length
      break
    case 'base64':
      ret = base64ToBytes(str).length
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = str.length * 2
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.concat = function (list, totalLength) {
  assert(isArray(list), 'Usage: Buffer.concat(list, [totalLength])\n' +
      'list should be an Array.')

  if (list.length === 0) {
    return new Buffer(0)
  } else if (list.length === 1) {
    return list[0]
  }

  var i
  if (typeof totalLength !== 'number') {
    totalLength = 0
    for (i = 0; i < list.length; i++) {
      totalLength += list[i].length
    }
  }

  var buf = new Buffer(totalLength)
  var pos = 0
  for (i = 0; i < list.length; i++) {
    var item = list[i]
    item.copy(buf, pos)
    pos += item.length
  }
  return buf
}

// BUFFER INSTANCE METHODS
// =======================

function _hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  assert(strLen % 2 === 0, 'Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; i++) {
    var byte = parseInt(string.substr(i * 2, 2), 16)
    assert(!isNaN(byte), 'Invalid hex string')
    buf[offset + i] = byte
  }
  Buffer._charsWritten = i * 2
  return i
}

function _utf8Write (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(utf8ToBytes(string), buf, offset, length)
  return charsWritten
}

function _asciiWrite (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(asciiToBytes(string), buf, offset, length)
  return charsWritten
}

function _binaryWrite (buf, string, offset, length) {
  return _asciiWrite(buf, string, offset, length)
}

function _base64Write (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(base64ToBytes(string), buf, offset, length)
  return charsWritten
}

function _utf16leWrite (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(utf16leToBytes(string), buf, offset, length)
  return charsWritten
}

Buffer.prototype.write = function (string, offset, length, encoding) {
  // Support both (string, offset, length, encoding)
  // and the legacy (string, encoding, offset, length)
  if (isFinite(offset)) {
    if (!isFinite(length)) {
      encoding = length
      length = undefined
    }
  } else {  // legacy
    var swap = encoding
    encoding = offset
    offset = length
    length = swap
  }

  offset = Number(offset) || 0
  var remaining = this.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }
  encoding = String(encoding || 'utf8').toLowerCase()

  var ret
  switch (encoding) {
    case 'hex':
      ret = _hexWrite(this, string, offset, length)
      break
    case 'utf8':
    case 'utf-8':
      ret = _utf8Write(this, string, offset, length)
      break
    case 'ascii':
      ret = _asciiWrite(this, string, offset, length)
      break
    case 'binary':
      ret = _binaryWrite(this, string, offset, length)
      break
    case 'base64':
      ret = _base64Write(this, string, offset, length)
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = _utf16leWrite(this, string, offset, length)
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.prototype.toString = function (encoding, start, end) {
  var self = this

  encoding = String(encoding || 'utf8').toLowerCase()
  start = Number(start) || 0
  end = (end !== undefined)
    ? Number(end)
    : end = self.length

  // Fastpath empty strings
  if (end === start)
    return ''

  var ret
  switch (encoding) {
    case 'hex':
      ret = _hexSlice(self, start, end)
      break
    case 'utf8':
    case 'utf-8':
      ret = _utf8Slice(self, start, end)
      break
    case 'ascii':
      ret = _asciiSlice(self, start, end)
      break
    case 'binary':
      ret = _binarySlice(self, start, end)
      break
    case 'base64':
      ret = _base64Slice(self, start, end)
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = _utf16leSlice(self, start, end)
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.prototype.toJSON = function () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function (target, target_start, start, end) {
  var source = this

  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (!target_start) target_start = 0

  // Copy 0 bytes; we're done
  if (end === start) return
  if (target.length === 0 || source.length === 0) return

  // Fatal error conditions
  assert(end >= start, 'sourceEnd < sourceStart')
  assert(target_start >= 0 && target_start < target.length,
      'targetStart out of bounds')
  assert(start >= 0 && start < source.length, 'sourceStart out of bounds')
  assert(end >= 0 && end <= source.length, 'sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length)
    end = this.length
  if (target.length - target_start < end - start)
    end = target.length - target_start + start

  var len = end - start

  if (len < 100 || !Buffer._useTypedArrays) {
    for (var i = 0; i < len; i++)
      target[i + target_start] = this[i + start]
  } else {
    target._set(new Uint8Array(this.buffer, start, len), target_start)
  }
}

function _base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function _utf8Slice (buf, start, end) {
  var res = ''
  var tmp = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    if (buf[i] <= 0x7F) {
      res += decodeUtf8Char(tmp) + String.fromCharCode(buf[i])
      tmp = ''
    } else {
      tmp += '%' + buf[i].toString(16)
    }
  }

  return res + decodeUtf8Char(tmp)
}

function _asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++)
    ret += String.fromCharCode(buf[i])
  return ret
}

function _binarySlice (buf, start, end) {
  return _asciiSlice(buf, start, end)
}

function _hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; i++) {
    out += toHex(buf[i])
  }
  return out
}

function _utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i+1] * 256)
  }
  return res
}

Buffer.prototype.slice = function (start, end) {
  var len = this.length
  start = clamp(start, len, 0)
  end = clamp(end, len, len)

  if (Buffer._useTypedArrays) {
    return augment(this.subarray(start, end))
  } else {
    var sliceLen = end - start
    var newBuf = new Buffer(sliceLen, undefined, true)
    for (var i = 0; i < sliceLen; i++) {
      newBuf[i] = this[i + start]
    }
    return newBuf
  }
}

// `get` will be removed in Node 0.13+
Buffer.prototype.get = function (offset) {
  console.log('.get() is deprecated. Access using array indexes instead.')
  return this.readUInt8(offset)
}

// `set` will be removed in Node 0.13+
Buffer.prototype.set = function (v, offset) {
  console.log('.set() is deprecated. Access using array indexes instead.')
  return this.writeUInt8(v, offset)
}

Buffer.prototype.readUInt8 = function (offset, noAssert) {
  if (!noAssert) {
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'Trying to read beyond buffer length')
  }

  if (offset >= this.length)
    return

  return this[offset]
}

function _readUInt16 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val
  if (littleEndian) {
    val = buf[offset]
    if (offset + 1 < len)
      val |= buf[offset + 1] << 8
  } else {
    val = buf[offset] << 8
    if (offset + 1 < len)
      val |= buf[offset + 1]
  }
  return val
}

Buffer.prototype.readUInt16LE = function (offset, noAssert) {
  return _readUInt16(this, offset, true, noAssert)
}

Buffer.prototype.readUInt16BE = function (offset, noAssert) {
  return _readUInt16(this, offset, false, noAssert)
}

function _readUInt32 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val
  if (littleEndian) {
    if (offset + 2 < len)
      val = buf[offset + 2] << 16
    if (offset + 1 < len)
      val |= buf[offset + 1] << 8
    val |= buf[offset]
    if (offset + 3 < len)
      val = val + (buf[offset + 3] << 24 >>> 0)
  } else {
    if (offset + 1 < len)
      val = buf[offset + 1] << 16
    if (offset + 2 < len)
      val |= buf[offset + 2] << 8
    if (offset + 3 < len)
      val |= buf[offset + 3]
    val = val + (buf[offset] << 24 >>> 0)
  }
  return val
}

Buffer.prototype.readUInt32LE = function (offset, noAssert) {
  return _readUInt32(this, offset, true, noAssert)
}

Buffer.prototype.readUInt32BE = function (offset, noAssert) {
  return _readUInt32(this, offset, false, noAssert)
}

Buffer.prototype.readInt8 = function (offset, noAssert) {
  if (!noAssert) {
    assert(offset !== undefined && offset !== null,
        'missing offset')
    assert(offset < this.length, 'Trying to read beyond buffer length')
  }

  if (offset >= this.length)
    return

  var neg = this[offset] & 0x80
  if (neg)
    return (0xff - this[offset] + 1) * -1
  else
    return this[offset]
}

function _readInt16 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val = _readUInt16(buf, offset, littleEndian, true)
  var neg = val & 0x8000
  if (neg)
    return (0xffff - val + 1) * -1
  else
    return val
}

Buffer.prototype.readInt16LE = function (offset, noAssert) {
  return _readInt16(this, offset, true, noAssert)
}

Buffer.prototype.readInt16BE = function (offset, noAssert) {
  return _readInt16(this, offset, false, noAssert)
}

function _readInt32 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val = _readUInt32(buf, offset, littleEndian, true)
  var neg = val & 0x80000000
  if (neg)
    return (0xffffffff - val + 1) * -1
  else
    return val
}

Buffer.prototype.readInt32LE = function (offset, noAssert) {
  return _readInt32(this, offset, true, noAssert)
}

Buffer.prototype.readInt32BE = function (offset, noAssert) {
  return _readInt32(this, offset, false, noAssert)
}

function _readFloat (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  return ieee754.read(buf, offset, littleEndian, 23, 4)
}

Buffer.prototype.readFloatLE = function (offset, noAssert) {
  return _readFloat(this, offset, true, noAssert)
}

Buffer.prototype.readFloatBE = function (offset, noAssert) {
  return _readFloat(this, offset, false, noAssert)
}

function _readDouble (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset + 7 < buf.length, 'Trying to read beyond buffer length')
  }

  return ieee754.read(buf, offset, littleEndian, 52, 8)
}

Buffer.prototype.readDoubleLE = function (offset, noAssert) {
  return _readDouble(this, offset, true, noAssert)
}

Buffer.prototype.readDoubleBE = function (offset, noAssert) {
  return _readDouble(this, offset, false, noAssert)
}

Buffer.prototype.writeUInt8 = function (value, offset, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'trying to write beyond buffer length')
    verifuint(value, 0xff)
  }

  if (offset >= this.length) return

  this[offset] = value
}

function _writeUInt16 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'trying to write beyond buffer length')
    verifuint(value, 0xffff)
  }

  var len = buf.length
  if (offset >= len)
    return

  for (var i = 0, j = Math.min(len - offset, 2); i < j; i++) {
    buf[offset + i] =
        (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
            (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function (value, offset, noAssert) {
  _writeUInt16(this, value, offset, true, noAssert)
}

Buffer.prototype.writeUInt16BE = function (value, offset, noAssert) {
  _writeUInt16(this, value, offset, false, noAssert)
}

function _writeUInt32 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'trying to write beyond buffer length')
    verifuint(value, 0xffffffff)
  }

  var len = buf.length
  if (offset >= len)
    return

  for (var i = 0, j = Math.min(len - offset, 4); i < j; i++) {
    buf[offset + i] =
        (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
}

Buffer.prototype.writeUInt32LE = function (value, offset, noAssert) {
  _writeUInt32(this, value, offset, true, noAssert)
}

Buffer.prototype.writeUInt32BE = function (value, offset, noAssert) {
  _writeUInt32(this, value, offset, false, noAssert)
}

Buffer.prototype.writeInt8 = function (value, offset, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7f, -0x80)
  }

  if (offset >= this.length)
    return

  if (value >= 0)
    this.writeUInt8(value, offset, noAssert)
  else
    this.writeUInt8(0xff + value + 1, offset, noAssert)
}

function _writeInt16 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7fff, -0x8000)
  }

  var len = buf.length
  if (offset >= len)
    return

  if (value >= 0)
    _writeUInt16(buf, value, offset, littleEndian, noAssert)
  else
    _writeUInt16(buf, 0xffff + value + 1, offset, littleEndian, noAssert)
}

Buffer.prototype.writeInt16LE = function (value, offset, noAssert) {
  _writeInt16(this, value, offset, true, noAssert)
}

Buffer.prototype.writeInt16BE = function (value, offset, noAssert) {
  _writeInt16(this, value, offset, false, noAssert)
}

function _writeInt32 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7fffffff, -0x80000000)
  }

  var len = buf.length
  if (offset >= len)
    return

  if (value >= 0)
    _writeUInt32(buf, value, offset, littleEndian, noAssert)
  else
    _writeUInt32(buf, 0xffffffff + value + 1, offset, littleEndian, noAssert)
}

Buffer.prototype.writeInt32LE = function (value, offset, noAssert) {
  _writeInt32(this, value, offset, true, noAssert)
}

Buffer.prototype.writeInt32BE = function (value, offset, noAssert) {
  _writeInt32(this, value, offset, false, noAssert)
}

function _writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to write beyond buffer length')
    verifIEEE754(value, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }

  var len = buf.length
  if (offset >= len)
    return

  ieee754.write(buf, value, offset, littleEndian, 23, 4)
}

Buffer.prototype.writeFloatLE = function (value, offset, noAssert) {
  _writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function (value, offset, noAssert) {
  _writeFloat(this, value, offset, false, noAssert)
}

function _writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 7 < buf.length,
        'Trying to write beyond buffer length')
    verifIEEE754(value, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }

  var len = buf.length
  if (offset >= len)
    return

  ieee754.write(buf, value, offset, littleEndian, 52, 8)
}

Buffer.prototype.writeDoubleLE = function (value, offset, noAssert) {
  _writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function (value, offset, noAssert) {
  _writeDouble(this, value, offset, false, noAssert)
}

// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function (value, start, end) {
  if (!value) value = 0
  if (!start) start = 0
  if (!end) end = this.length

  if (typeof value === 'string') {
    value = value.charCodeAt(0)
  }

  assert(typeof value === 'number' && !isNaN(value), 'value is not a number')
  assert(end >= start, 'end < start')

  // Fill 0 bytes; we're done
  if (end === start) return
  if (this.length === 0) return

  assert(start >= 0 && start < this.length, 'start out of bounds')
  assert(end >= 0 && end <= this.length, 'end out of bounds')

  for (var i = start; i < end; i++) {
    this[i] = value
  }
}

Buffer.prototype.inspect = function () {
  var out = []
  var len = this.length
  for (var i = 0; i < len; i++) {
    out[i] = toHex(this[i])
    if (i === exports.INSPECT_MAX_BYTES) {
      out[i + 1] = '...'
      break
    }
  }
  return '<Buffer ' + out.join(' ') + '>'
}

/**
 * Creates a new `ArrayBuffer` with the *copied* memory of the buffer instance.
 * Added in Node 0.12. Only available in browsers that support ArrayBuffer.
 */
Buffer.prototype.toArrayBuffer = function () {
  if (typeof Uint8Array === 'function') {
    if (Buffer._useTypedArrays) {
      return (new Buffer(this)).buffer
    } else {
      var buf = new Uint8Array(this.length)
      for (var i = 0, len = buf.length; i < len; i += 1)
        buf[i] = this[i]
      return buf.buffer
    }
  } else {
    throw new Error('Buffer.toArrayBuffer not supported in this browser')
  }
}

// HELPER FUNCTIONS
// ================

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

var BP = Buffer.prototype

/**
 * Augment the Uint8Array *instance* (not the class!) with Buffer methods
 */
function augment (arr) {
  arr._isBuffer = true

  // save reference to original Uint8Array get/set methods before overwriting
  arr._get = arr.get
  arr._set = arr.set

  // deprecated, will be removed in node 0.13+
  arr.get = BP.get
  arr.set = BP.set

  arr.write = BP.write
  arr.toString = BP.toString
  arr.toLocaleString = BP.toString
  arr.toJSON = BP.toJSON
  arr.copy = BP.copy
  arr.slice = BP.slice
  arr.readUInt8 = BP.readUInt8
  arr.readUInt16LE = BP.readUInt16LE
  arr.readUInt16BE = BP.readUInt16BE
  arr.readUInt32LE = BP.readUInt32LE
  arr.readUInt32BE = BP.readUInt32BE
  arr.readInt8 = BP.readInt8
  arr.readInt16LE = BP.readInt16LE
  arr.readInt16BE = BP.readInt16BE
  arr.readInt32LE = BP.readInt32LE
  arr.readInt32BE = BP.readInt32BE
  arr.readFloatLE = BP.readFloatLE
  arr.readFloatBE = BP.readFloatBE
  arr.readDoubleLE = BP.readDoubleLE
  arr.readDoubleBE = BP.readDoubleBE
  arr.writeUInt8 = BP.writeUInt8
  arr.writeUInt16LE = BP.writeUInt16LE
  arr.writeUInt16BE = BP.writeUInt16BE
  arr.writeUInt32LE = BP.writeUInt32LE
  arr.writeUInt32BE = BP.writeUInt32BE
  arr.writeInt8 = BP.writeInt8
  arr.writeInt16LE = BP.writeInt16LE
  arr.writeInt16BE = BP.writeInt16BE
  arr.writeInt32LE = BP.writeInt32LE
  arr.writeInt32BE = BP.writeInt32BE
  arr.writeFloatLE = BP.writeFloatLE
  arr.writeFloatBE = BP.writeFloatBE
  arr.writeDoubleLE = BP.writeDoubleLE
  arr.writeDoubleBE = BP.writeDoubleBE
  arr.fill = BP.fill
  arr.inspect = BP.inspect
  arr.toArrayBuffer = BP.toArrayBuffer

  return arr
}

// slice(start, end)
function clamp (index, len, defaultValue) {
  if (typeof index !== 'number') return defaultValue
  index = ~~index;  // Coerce to integer.
  if (index >= len) return len
  if (index >= 0) return index
  index += len
  if (index >= 0) return index
  return 0
}

function coerce (length) {
  // Coerce length to a number (possibly NaN), round up
  // in case it's fractional (e.g. 123.456) then do a
  // double negate to coerce a NaN to 0. Easy, right?
  length = ~~Math.ceil(+length)
  return length < 0 ? 0 : length
}

function isArray (subject) {
  return (Array.isArray || function (subject) {
    return Object.prototype.toString.call(subject) === '[object Array]'
  })(subject)
}

function isArrayish (subject) {
  return isArray(subject) || Buffer.isBuffer(subject) ||
      subject && typeof subject === 'object' &&
      typeof subject.length === 'number'
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    var b = str.charCodeAt(i)
    if (b <= 0x7F)
      byteArray.push(str.charCodeAt(i))
    else {
      var start = i
      if (b >= 0xD800 && b <= 0xDFFF) i++
      var h = encodeURIComponent(str.slice(start, i+1)).substr(1).split('%')
      for (var j = 0; j < h.length; j++)
        byteArray.push(parseInt(h[j], 16))
    }
  }
  return byteArray
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(str)
}

function blitBuffer (src, dst, offset, length) {
  var pos
  for (var i = 0; i < length; i++) {
    if ((i + offset >= dst.length) || (i >= src.length))
      break
    dst[i + offset] = src[i]
  }
  return i
}

function decodeUtf8Char (str) {
  try {
    return decodeURIComponent(str)
  } catch (err) {
    return String.fromCharCode(0xFFFD) // UTF 8 invalid char
  }
}

/*
 * We have to make sure that the value is a valid integer. This means that it
 * is non-negative. It has no fractional component and that it does not
 * exceed the maximum allowed value.
 */
function verifuint (value, max) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value >= 0, 'specified a negative value for writing an unsigned value')
  assert(value <= max, 'value is larger than maximum value for type')
  assert(Math.floor(value) === value, 'value has a fractional component')
}

function verifsint (value, max, min) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value <= max, 'value larger than maximum allowed value')
  assert(value >= min, 'value smaller than minimum allowed value')
  assert(Math.floor(value) === value, 'value has a fractional component')
}

function verifIEEE754 (value, max, min) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value <= max, 'value larger than maximum allowed value')
  assert(value >= min, 'value smaller than minimum allowed value')
}

function assert (test, message) {
  if (!test) throw new Error(message || 'Failed assertion')
}

},{"base64-js":2,"ieee754":3}],2:[function(_dereq_,module,exports){
var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

;(function (exports) {
	'use strict';

  var Arr = (typeof Uint8Array !== 'undefined')
    ? Uint8Array
    : Array

	var ZERO   = '0'.charCodeAt(0)
	var PLUS   = '+'.charCodeAt(0)
	var SLASH  = '/'.charCodeAt(0)
	var NUMBER = '0'.charCodeAt(0)
	var LOWER  = 'a'.charCodeAt(0)
	var UPPER  = 'A'.charCodeAt(0)

	function decode (elt) {
		var code = elt.charCodeAt(0)
		if (code === PLUS)
			return 62 // '+'
		if (code === SLASH)
			return 63 // '/'
		if (code < NUMBER)
			return -1 //no match
		if (code < NUMBER + 10)
			return code - NUMBER + 26 + 26
		if (code < UPPER + 26)
			return code - UPPER
		if (code < LOWER + 26)
			return code - LOWER + 26
	}

	function b64ToByteArray (b64) {
		var i, j, l, tmp, placeHolders, arr

		if (b64.length % 4 > 0) {
			throw new Error('Invalid string. Length must be a multiple of 4')
		}

		// the number of equal signs (place holders)
		// if there are two placeholders, than the two characters before it
		// represent one byte
		// if there is only one, then the three characters before it represent 2 bytes
		// this is just a cheap hack to not do indexOf twice
		var len = b64.length
		placeHolders = '=' === b64.charAt(len - 2) ? 2 : '=' === b64.charAt(len - 1) ? 1 : 0

		// base64 is 4/3 + up to two characters of the original data
		arr = new Arr(b64.length * 3 / 4 - placeHolders)

		// if there are placeholders, only get up to the last complete 4 chars
		l = placeHolders > 0 ? b64.length - 4 : b64.length

		var L = 0

		function push (v) {
			arr[L++] = v
		}

		for (i = 0, j = 0; i < l; i += 4, j += 3) {
			tmp = (decode(b64.charAt(i)) << 18) | (decode(b64.charAt(i + 1)) << 12) | (decode(b64.charAt(i + 2)) << 6) | decode(b64.charAt(i + 3))
			push((tmp & 0xFF0000) >> 16)
			push((tmp & 0xFF00) >> 8)
			push(tmp & 0xFF)
		}

		if (placeHolders === 2) {
			tmp = (decode(b64.charAt(i)) << 2) | (decode(b64.charAt(i + 1)) >> 4)
			push(tmp & 0xFF)
		} else if (placeHolders === 1) {
			tmp = (decode(b64.charAt(i)) << 10) | (decode(b64.charAt(i + 1)) << 4) | (decode(b64.charAt(i + 2)) >> 2)
			push((tmp >> 8) & 0xFF)
			push(tmp & 0xFF)
		}

		return arr
	}

	function uint8ToBase64 (uint8) {
		var i,
			extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
			output = "",
			temp, length

		function encode (num) {
			return lookup.charAt(num)
		}

		function tripletToBase64 (num) {
			return encode(num >> 18 & 0x3F) + encode(num >> 12 & 0x3F) + encode(num >> 6 & 0x3F) + encode(num & 0x3F)
		}

		// go through the array every three bytes, we'll deal with trailing stuff later
		for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
			temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
			output += tripletToBase64(temp)
		}

		// pad the end with zeros, but make sure to not forget the extra bytes
		switch (extraBytes) {
			case 1:
				temp = uint8[uint8.length - 1]
				output += encode(temp >> 2)
				output += encode((temp << 4) & 0x3F)
				output += '=='
				break
			case 2:
				temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1])
				output += encode(temp >> 10)
				output += encode((temp >> 4) & 0x3F)
				output += encode((temp << 2) & 0x3F)
				output += '='
				break
		}

		return output
	}

	module.exports.toByteArray = b64ToByteArray
	module.exports.fromByteArray = uint8ToBase64
}())

},{}],3:[function(_dereq_,module,exports){
exports.read = function(buffer, offset, isLE, mLen, nBytes) {
  var e, m,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      nBits = -7,
      i = isLE ? (nBytes - 1) : 0,
      d = isLE ? -1 : 1,
      s = buffer[offset + i];

  i += d;

  e = s & ((1 << (-nBits)) - 1);
  s >>= (-nBits);
  nBits += eLen;
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8);

  m = e & ((1 << (-nBits)) - 1);
  e >>= (-nBits);
  nBits += mLen;
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8);

  if (e === 0) {
    e = 1 - eBias;
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity);
  } else {
    m = m + Math.pow(2, mLen);
    e = e - eBias;
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
};

exports.write = function(buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0),
      i = isLE ? 0 : (nBytes - 1),
      d = isLE ? 1 : -1,
      s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

  value = Math.abs(value);

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0;
    e = eMax;
  } else {
    e = Math.floor(Math.log(value) / Math.LN2);
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--;
      c *= 2;
    }
    if (e + eBias >= 1) {
      value += rt / c;
    } else {
      value += rt * Math.pow(2, 1 - eBias);
    }
    if (value * c >= 2) {
      e++;
      c /= 2;
    }

    if (e + eBias >= eMax) {
      m = 0;
      e = eMax;
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen);
      e = e + eBias;
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
      e = 0;
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8);

  e = (e << mLen) | m;
  eLen += mLen;
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8);

  buffer[offset + i - d] |= s * 128;
};

},{}],4:[function(_dereq_,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      } else {
        throw TypeError('Uncaught, unspecified "error" event.');
      }
      return false;
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      console.trace();
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],5:[function(_dereq_,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],6:[function(_dereq_,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.once = noop;
process.off = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],7:[function(_dereq_,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// a duplex stream is just a stream that is both readable and writable.
// Since JS doesn't have multiple prototypal inheritance, this class
// prototypally inherits from Readable, and then parasitically from
// Writable.

module.exports = Duplex;
var inherits = _dereq_('inherits');
var setImmediate = _dereq_('process/browser.js').nextTick;
var Readable = _dereq_('./readable.js');
var Writable = _dereq_('./writable.js');

inherits(Duplex, Readable);

Duplex.prototype.write = Writable.prototype.write;
Duplex.prototype.end = Writable.prototype.end;
Duplex.prototype._write = Writable.prototype._write;

function Duplex(options) {
  if (!(this instanceof Duplex))
    return new Duplex(options);

  Readable.call(this, options);
  Writable.call(this, options);

  if (options && options.readable === false)
    this.readable = false;

  if (options && options.writable === false)
    this.writable = false;

  this.allowHalfOpen = true;
  if (options && options.allowHalfOpen === false)
    this.allowHalfOpen = false;

  this.once('end', onend);
}

// the no-half-open enforcer
function onend() {
  // if we allow half-open state, or if the writable side ended,
  // then we're ok.
  if (this.allowHalfOpen || this._writableState.ended)
    return;

  // no more data can be written.
  // But allow more writes to happen in this tick.
  var self = this;
  setImmediate(function () {
    self.end();
  });
}

},{"./readable.js":11,"./writable.js":13,"inherits":5,"process/browser.js":9}],8:[function(_dereq_,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

module.exports = Stream;

var EE = _dereq_('events').EventEmitter;
var inherits = _dereq_('inherits');

inherits(Stream, EE);
Stream.Readable = _dereq_('./readable.js');
Stream.Writable = _dereq_('./writable.js');
Stream.Duplex = _dereq_('./duplex.js');
Stream.Transform = _dereq_('./transform.js');
Stream.PassThrough = _dereq_('./passthrough.js');

// Backwards-compat with node 0.4.x
Stream.Stream = Stream;



// old-style streams.  Note that the pipe method (the only relevant
// part of this class) is overridden in the Readable class.

function Stream() {
  EE.call(this);
}

Stream.prototype.pipe = function(dest, options) {
  var source = this;

  function ondata(chunk) {
    if (dest.writable) {
      if (false === dest.write(chunk) && source.pause) {
        source.pause();
      }
    }
  }

  source.on('data', ondata);

  function ondrain() {
    if (source.readable && source.resume) {
      source.resume();
    }
  }

  dest.on('drain', ondrain);

  // If the 'end' option is not supplied, dest.end() will be called when
  // source gets the 'end' or 'close' events.  Only dest.end() once.
  if (!dest._isStdio && (!options || options.end !== false)) {
    source.on('end', onend);
    source.on('close', onclose);
  }

  var didOnEnd = false;
  function onend() {
    if (didOnEnd) return;
    didOnEnd = true;

    dest.end();
  }


  function onclose() {
    if (didOnEnd) return;
    didOnEnd = true;

    if (typeof dest.destroy === 'function') dest.destroy();
  }

  // don't leave dangling pipes when there are errors.
  function onerror(er) {
    cleanup();
    if (EE.listenerCount(this, 'error') === 0) {
      throw er; // Unhandled stream error in pipe.
    }
  }

  source.on('error', onerror);
  dest.on('error', onerror);

  // remove all the event listeners that were added.
  function cleanup() {
    source.removeListener('data', ondata);
    dest.removeListener('drain', ondrain);

    source.removeListener('end', onend);
    source.removeListener('close', onclose);

    source.removeListener('error', onerror);
    dest.removeListener('error', onerror);

    source.removeListener('end', cleanup);
    source.removeListener('close', cleanup);

    dest.removeListener('close', cleanup);
  }

  source.on('end', cleanup);
  source.on('close', cleanup);

  dest.on('close', cleanup);

  dest.emit('pipe', source);

  // Allow for unix-like usage: A.pipe(B).pipe(C)
  return dest;
};

},{"./duplex.js":7,"./passthrough.js":10,"./readable.js":11,"./transform.js":12,"./writable.js":13,"events":4,"inherits":5}],9:[function(_dereq_,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],10:[function(_dereq_,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// a passthrough stream.
// basically just the most minimal sort of Transform stream.
// Every written chunk gets output as-is.

module.exports = PassThrough;

var Transform = _dereq_('./transform.js');
var inherits = _dereq_('inherits');
inherits(PassThrough, Transform);

function PassThrough(options) {
  if (!(this instanceof PassThrough))
    return new PassThrough(options);

  Transform.call(this, options);
}

PassThrough.prototype._transform = function(chunk, encoding, cb) {
  cb(null, chunk);
};

},{"./transform.js":12,"inherits":5}],11:[function(_dereq_,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

module.exports = Readable;
Readable.ReadableState = ReadableState;

var EE = _dereq_('events').EventEmitter;
var Stream = _dereq_('./index.js');
var Buffer = _dereq_('buffer').Buffer;
var setImmediate = _dereq_('process/browser.js').nextTick;
var StringDecoder;

var inherits = _dereq_('inherits');
inherits(Readable, Stream);

function ReadableState(options, stream) {
  options = options || {};

  // the point at which it stops calling _read() to fill the buffer
  // Note: 0 is a valid value, means "don't call _read preemptively ever"
  var hwm = options.highWaterMark;
  this.highWaterMark = (hwm || hwm === 0) ? hwm : 16 * 1024;

  // cast to ints.
  this.highWaterMark = ~~this.highWaterMark;

  this.buffer = [];
  this.length = 0;
  this.pipes = null;
  this.pipesCount = 0;
  this.flowing = false;
  this.ended = false;
  this.endEmitted = false;
  this.reading = false;

  // In streams that never have any data, and do push(null) right away,
  // the consumer can miss the 'end' event if they do some I/O before
  // consuming the stream.  So, we don't emit('end') until some reading
  // happens.
  this.calledRead = false;

  // a flag to be able to tell if the onwrite cb is called immediately,
  // or on a later tick.  We set this to true at first, becuase any
  // actions that shouldn't happen until "later" should generally also
  // not happen before the first write call.
  this.sync = true;

  // whenever we return null, then we set a flag to say
  // that we're awaiting a 'readable' event emission.
  this.needReadable = false;
  this.emittedReadable = false;
  this.readableListening = false;


  // object stream flag. Used to make read(n) ignore n and to
  // make all the buffer merging and length checks go away
  this.objectMode = !!options.objectMode;

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = options.defaultEncoding || 'utf8';

  // when piping, we only care about 'readable' events that happen
  // after read()ing all the bytes and not getting any pushback.
  this.ranOut = false;

  // the number of writers that are awaiting a drain event in .pipe()s
  this.awaitDrain = 0;

  // if true, a maybeReadMore has been scheduled
  this.readingMore = false;

  this.decoder = null;
  this.encoding = null;
  if (options.encoding) {
    if (!StringDecoder)
      StringDecoder = _dereq_('string_decoder').StringDecoder;
    this.decoder = new StringDecoder(options.encoding);
    this.encoding = options.encoding;
  }
}

function Readable(options) {
  if (!(this instanceof Readable))
    return new Readable(options);

  this._readableState = new ReadableState(options, this);

  // legacy
  this.readable = true;

  Stream.call(this);
}

// Manually shove something into the read() buffer.
// This returns true if the highWaterMark has not been hit yet,
// similar to how Writable.write() returns true if you should
// write() some more.
Readable.prototype.push = function(chunk, encoding) {
  var state = this._readableState;

  if (typeof chunk === 'string' && !state.objectMode) {
    encoding = encoding || state.defaultEncoding;
    if (encoding !== state.encoding) {
      chunk = new Buffer(chunk, encoding);
      encoding = '';
    }
  }

  return readableAddChunk(this, state, chunk, encoding, false);
};

// Unshift should *always* be something directly out of read()
Readable.prototype.unshift = function(chunk) {
  var state = this._readableState;
  return readableAddChunk(this, state, chunk, '', true);
};

function readableAddChunk(stream, state, chunk, encoding, addToFront) {
  var er = chunkInvalid(state, chunk);
  if (er) {
    stream.emit('error', er);
  } else if (chunk === null || chunk === undefined) {
    state.reading = false;
    if (!state.ended)
      onEofChunk(stream, state);
  } else if (state.objectMode || chunk && chunk.length > 0) {
    if (state.ended && !addToFront) {
      var e = new Error('stream.push() after EOF');
      stream.emit('error', e);
    } else if (state.endEmitted && addToFront) {
      var e = new Error('stream.unshift() after end event');
      stream.emit('error', e);
    } else {
      if (state.decoder && !addToFront && !encoding)
        chunk = state.decoder.write(chunk);

      // update the buffer info.
      state.length += state.objectMode ? 1 : chunk.length;
      if (addToFront) {
        state.buffer.unshift(chunk);
      } else {
        state.reading = false;
        state.buffer.push(chunk);
      }

      if (state.needReadable)
        emitReadable(stream);

      maybeReadMore(stream, state);
    }
  } else if (!addToFront) {
    state.reading = false;
  }

  return needMoreData(state);
}



// if it's past the high water mark, we can push in some more.
// Also, if we have no data yet, we can stand some
// more bytes.  This is to work around cases where hwm=0,
// such as the repl.  Also, if the push() triggered a
// readable event, and the user called read(largeNumber) such that
// needReadable was set, then we ought to push more, so that another
// 'readable' event will be triggered.
function needMoreData(state) {
  return !state.ended &&
         (state.needReadable ||
          state.length < state.highWaterMark ||
          state.length === 0);
}

// backwards compatibility.
Readable.prototype.setEncoding = function(enc) {
  if (!StringDecoder)
    StringDecoder = _dereq_('string_decoder').StringDecoder;
  this._readableState.decoder = new StringDecoder(enc);
  this._readableState.encoding = enc;
};

// Don't raise the hwm > 128MB
var MAX_HWM = 0x800000;
function roundUpToNextPowerOf2(n) {
  if (n >= MAX_HWM) {
    n = MAX_HWM;
  } else {
    // Get the next highest power of 2
    n--;
    for (var p = 1; p < 32; p <<= 1) n |= n >> p;
    n++;
  }
  return n;
}

function howMuchToRead(n, state) {
  if (state.length === 0 && state.ended)
    return 0;

  if (state.objectMode)
    return n === 0 ? 0 : 1;

  if (isNaN(n) || n === null) {
    // only flow one buffer at a time
    if (state.flowing && state.buffer.length)
      return state.buffer[0].length;
    else
      return state.length;
  }

  if (n <= 0)
    return 0;

  // If we're asking for more than the target buffer level,
  // then raise the water mark.  Bump up to the next highest
  // power of 2, to prevent increasing it excessively in tiny
  // amounts.
  if (n > state.highWaterMark)
    state.highWaterMark = roundUpToNextPowerOf2(n);

  // don't have that much.  return null, unless we've ended.
  if (n > state.length) {
    if (!state.ended) {
      state.needReadable = true;
      return 0;
    } else
      return state.length;
  }

  return n;
}

// you can override either this method, or the async _read(n) below.
Readable.prototype.read = function(n) {
  var state = this._readableState;
  state.calledRead = true;
  var nOrig = n;

  if (typeof n !== 'number' || n > 0)
    state.emittedReadable = false;

  // if we're doing read(0) to trigger a readable event, but we
  // already have a bunch of data in the buffer, then just trigger
  // the 'readable' event and move on.
  if (n === 0 &&
      state.needReadable &&
      (state.length >= state.highWaterMark || state.ended)) {
    emitReadable(this);
    return null;
  }

  n = howMuchToRead(n, state);

  // if we've ended, and we're now clear, then finish it up.
  if (n === 0 && state.ended) {
    if (state.length === 0)
      endReadable(this);
    return null;
  }

  // All the actual chunk generation logic needs to be
  // *below* the call to _read.  The reason is that in certain
  // synthetic stream cases, such as passthrough streams, _read
  // may be a completely synchronous operation which may change
  // the state of the read buffer, providing enough data when
  // before there was *not* enough.
  //
  // So, the steps are:
  // 1. Figure out what the state of things will be after we do
  // a read from the buffer.
  //
  // 2. If that resulting state will trigger a _read, then call _read.
  // Note that this may be asynchronous, or synchronous.  Yes, it is
  // deeply ugly to write APIs this way, but that still doesn't mean
  // that the Readable class should behave improperly, as streams are
  // designed to be sync/async agnostic.
  // Take note if the _read call is sync or async (ie, if the read call
  // has returned yet), so that we know whether or not it's safe to emit
  // 'readable' etc.
  //
  // 3. Actually pull the requested chunks out of the buffer and return.

  // if we need a readable event, then we need to do some reading.
  var doRead = state.needReadable;

  // if we currently have less than the highWaterMark, then also read some
  if (state.length - n <= state.highWaterMark)
    doRead = true;

  // however, if we've ended, then there's no point, and if we're already
  // reading, then it's unnecessary.
  if (state.ended || state.reading)
    doRead = false;

  if (doRead) {
    state.reading = true;
    state.sync = true;
    // if the length is currently zero, then we *need* a readable event.
    if (state.length === 0)
      state.needReadable = true;
    // call internal read method
    this._read(state.highWaterMark);
    state.sync = false;
  }

  // If _read called its callback synchronously, then `reading`
  // will be false, and we need to re-evaluate how much data we
  // can return to the user.
  if (doRead && !state.reading)
    n = howMuchToRead(nOrig, state);

  var ret;
  if (n > 0)
    ret = fromList(n, state);
  else
    ret = null;

  if (ret === null) {
    state.needReadable = true;
    n = 0;
  }

  state.length -= n;

  // If we have nothing in the buffer, then we want to know
  // as soon as we *do* get something into the buffer.
  if (state.length === 0 && !state.ended)
    state.needReadable = true;

  // If we happened to read() exactly the remaining amount in the
  // buffer, and the EOF has been seen at this point, then make sure
  // that we emit 'end' on the very next tick.
  if (state.ended && !state.endEmitted && state.length === 0)
    endReadable(this);

  return ret;
};

function chunkInvalid(state, chunk) {
  var er = null;
  if (!Buffer.isBuffer(chunk) &&
      'string' !== typeof chunk &&
      chunk !== null &&
      chunk !== undefined &&
      !state.objectMode &&
      !er) {
    er = new TypeError('Invalid non-string/buffer chunk');
  }
  return er;
}


function onEofChunk(stream, state) {
  if (state.decoder && !state.ended) {
    var chunk = state.decoder.end();
    if (chunk && chunk.length) {
      state.buffer.push(chunk);
      state.length += state.objectMode ? 1 : chunk.length;
    }
  }
  state.ended = true;

  // if we've ended and we have some data left, then emit
  // 'readable' now to make sure it gets picked up.
  if (state.length > 0)
    emitReadable(stream);
  else
    endReadable(stream);
}

// Don't emit readable right away in sync mode, because this can trigger
// another read() call => stack overflow.  This way, it might trigger
// a nextTick recursion warning, but that's not so bad.
function emitReadable(stream) {
  var state = stream._readableState;
  state.needReadable = false;
  if (state.emittedReadable)
    return;

  state.emittedReadable = true;
  if (state.sync)
    setImmediate(function() {
      emitReadable_(stream);
    });
  else
    emitReadable_(stream);
}

function emitReadable_(stream) {
  stream.emit('readable');
}


// at this point, the user has presumably seen the 'readable' event,
// and called read() to consume some data.  that may have triggered
// in turn another _read(n) call, in which case reading = true if
// it's in progress.
// However, if we're not ended, or reading, and the length < hwm,
// then go ahead and try to read some more preemptively.
function maybeReadMore(stream, state) {
  if (!state.readingMore) {
    state.readingMore = true;
    setImmediate(function() {
      maybeReadMore_(stream, state);
    });
  }
}

function maybeReadMore_(stream, state) {
  var len = state.length;
  while (!state.reading && !state.flowing && !state.ended &&
         state.length < state.highWaterMark) {
    stream.read(0);
    if (len === state.length)
      // didn't get any data, stop spinning.
      break;
    else
      len = state.length;
  }
  state.readingMore = false;
}

// abstract method.  to be overridden in specific implementation classes.
// call cb(er, data) where data is <= n in length.
// for virtual (non-string, non-buffer) streams, "length" is somewhat
// arbitrary, and perhaps not very meaningful.
Readable.prototype._read = function(n) {
  this.emit('error', new Error('not implemented'));
};

Readable.prototype.pipe = function(dest, pipeOpts) {
  var src = this;
  var state = this._readableState;

  switch (state.pipesCount) {
    case 0:
      state.pipes = dest;
      break;
    case 1:
      state.pipes = [state.pipes, dest];
      break;
    default:
      state.pipes.push(dest);
      break;
  }
  state.pipesCount += 1;

  var doEnd = (!pipeOpts || pipeOpts.end !== false) &&
              dest !== process.stdout &&
              dest !== process.stderr;

  var endFn = doEnd ? onend : cleanup;
  if (state.endEmitted)
    setImmediate(endFn);
  else
    src.once('end', endFn);

  dest.on('unpipe', onunpipe);
  function onunpipe(readable) {
    if (readable !== src) return;
    cleanup();
  }

  function onend() {
    dest.end();
  }

  // when the dest drains, it reduces the awaitDrain counter
  // on the source.  This would be more elegant with a .once()
  // handler in flow(), but adding and removing repeatedly is
  // too slow.
  var ondrain = pipeOnDrain(src);
  dest.on('drain', ondrain);

  function cleanup() {
    // cleanup event handlers once the pipe is broken
    dest.removeListener('close', onclose);
    dest.removeListener('finish', onfinish);
    dest.removeListener('drain', ondrain);
    dest.removeListener('error', onerror);
    dest.removeListener('unpipe', onunpipe);
    src.removeListener('end', onend);
    src.removeListener('end', cleanup);

    // if the reader is waiting for a drain event from this
    // specific writer, then it would cause it to never start
    // flowing again.
    // So, if this is awaiting a drain, then we just call it now.
    // If we don't know, then assume that we are waiting for one.
    if (!dest._writableState || dest._writableState.needDrain)
      ondrain();
  }

  // if the dest has an error, then stop piping into it.
  // however, don't suppress the throwing behavior for this.
  // check for listeners before emit removes one-time listeners.
  var errListeners = EE.listenerCount(dest, 'error');
  function onerror(er) {
    unpipe();
    if (errListeners === 0 && EE.listenerCount(dest, 'error') === 0)
      dest.emit('error', er);
  }
  dest.once('error', onerror);

  // Both close and finish should trigger unpipe, but only once.
  function onclose() {
    dest.removeListener('finish', onfinish);
    unpipe();
  }
  dest.once('close', onclose);
  function onfinish() {
    dest.removeListener('close', onclose);
    unpipe();
  }
  dest.once('finish', onfinish);

  function unpipe() {
    src.unpipe(dest);
  }

  // tell the dest that it's being piped to
  dest.emit('pipe', src);

  // start the flow if it hasn't been started already.
  if (!state.flowing) {
    // the handler that waits for readable events after all
    // the data gets sucked out in flow.
    // This would be easier to follow with a .once() handler
    // in flow(), but that is too slow.
    this.on('readable', pipeOnReadable);

    state.flowing = true;
    setImmediate(function() {
      flow(src);
    });
  }

  return dest;
};

function pipeOnDrain(src) {
  return function() {
    var dest = this;
    var state = src._readableState;
    state.awaitDrain--;
    if (state.awaitDrain === 0)
      flow(src);
  };
}

function flow(src) {
  var state = src._readableState;
  var chunk;
  state.awaitDrain = 0;

  function write(dest, i, list) {
    var written = dest.write(chunk);
    if (false === written) {
      state.awaitDrain++;
    }
  }

  while (state.pipesCount && null !== (chunk = src.read())) {

    if (state.pipesCount === 1)
      write(state.pipes, 0, null);
    else
      forEach(state.pipes, write);

    src.emit('data', chunk);

    // if anyone needs a drain, then we have to wait for that.
    if (state.awaitDrain > 0)
      return;
  }

  // if every destination was unpiped, either before entering this
  // function, or in the while loop, then stop flowing.
  //
  // NB: This is a pretty rare edge case.
  if (state.pipesCount === 0) {
    state.flowing = false;

    // if there were data event listeners added, then switch to old mode.
    if (EE.listenerCount(src, 'data') > 0)
      emitDataEvents(src);
    return;
  }

  // at this point, no one needed a drain, so we just ran out of data
  // on the next readable event, start it over again.
  state.ranOut = true;
}

function pipeOnReadable() {
  if (this._readableState.ranOut) {
    this._readableState.ranOut = false;
    flow(this);
  }
}


Readable.prototype.unpipe = function(dest) {
  var state = this._readableState;

  // if we're not piping anywhere, then do nothing.
  if (state.pipesCount === 0)
    return this;

  // just one destination.  most common case.
  if (state.pipesCount === 1) {
    // passed in one, but it's not the right one.
    if (dest && dest !== state.pipes)
      return this;

    if (!dest)
      dest = state.pipes;

    // got a match.
    state.pipes = null;
    state.pipesCount = 0;
    this.removeListener('readable', pipeOnReadable);
    state.flowing = false;
    if (dest)
      dest.emit('unpipe', this);
    return this;
  }

  // slow case. multiple pipe destinations.

  if (!dest) {
    // remove all.
    var dests = state.pipes;
    var len = state.pipesCount;
    state.pipes = null;
    state.pipesCount = 0;
    this.removeListener('readable', pipeOnReadable);
    state.flowing = false;

    for (var i = 0; i < len; i++)
      dests[i].emit('unpipe', this);
    return this;
  }

  // try to find the right one.
  var i = indexOf(state.pipes, dest);
  if (i === -1)
    return this;

  state.pipes.splice(i, 1);
  state.pipesCount -= 1;
  if (state.pipesCount === 1)
    state.pipes = state.pipes[0];

  dest.emit('unpipe', this);

  return this;
};

// set up data events if they are asked for
// Ensure readable listeners eventually get something
Readable.prototype.on = function(ev, fn) {
  var res = Stream.prototype.on.call(this, ev, fn);

  if (ev === 'data' && !this._readableState.flowing)
    emitDataEvents(this);

  if (ev === 'readable' && this.readable) {
    var state = this._readableState;
    if (!state.readableListening) {
      state.readableListening = true;
      state.emittedReadable = false;
      state.needReadable = true;
      if (!state.reading) {
        this.read(0);
      } else if (state.length) {
        emitReadable(this, state);
      }
    }
  }

  return res;
};
Readable.prototype.addListener = Readable.prototype.on;

// pause() and resume() are remnants of the legacy readable stream API
// If the user uses them, then switch into old mode.
Readable.prototype.resume = function() {
  emitDataEvents(this);
  this.read(0);
  this.emit('resume');
};

Readable.prototype.pause = function() {
  emitDataEvents(this, true);
  this.emit('pause');
};

function emitDataEvents(stream, startPaused) {
  var state = stream._readableState;

  if (state.flowing) {
    // https://github.com/isaacs/readable-stream/issues/16
    throw new Error('Cannot switch to old mode now.');
  }

  var paused = startPaused || false;
  var readable = false;

  // convert to an old-style stream.
  stream.readable = true;
  stream.pipe = Stream.prototype.pipe;
  stream.on = stream.addListener = Stream.prototype.on;

  stream.on('readable', function() {
    readable = true;

    var c;
    while (!paused && (null !== (c = stream.read())))
      stream.emit('data', c);

    if (c === null) {
      readable = false;
      stream._readableState.needReadable = true;
    }
  });

  stream.pause = function() {
    paused = true;
    this.emit('pause');
  };

  stream.resume = function() {
    paused = false;
    if (readable)
      setImmediate(function() {
        stream.emit('readable');
      });
    else
      this.read(0);
    this.emit('resume');
  };

  // now make it start, just in case it hadn't already.
  stream.emit('readable');
}

// wrap an old-style stream as the async data source.
// This is *not* part of the readable stream interface.
// It is an ugly unfortunate mess of history.
Readable.prototype.wrap = function(stream) {
  var state = this._readableState;
  var paused = false;

  var self = this;
  stream.on('end', function() {
    if (state.decoder && !state.ended) {
      var chunk = state.decoder.end();
      if (chunk && chunk.length)
        self.push(chunk);
    }

    self.push(null);
  });

  stream.on('data', function(chunk) {
    if (state.decoder)
      chunk = state.decoder.write(chunk);
    if (!chunk || !state.objectMode && !chunk.length)
      return;

    var ret = self.push(chunk);
    if (!ret) {
      paused = true;
      stream.pause();
    }
  });

  // proxy all the other methods.
  // important when wrapping filters and duplexes.
  for (var i in stream) {
    if (typeof stream[i] === 'function' &&
        typeof this[i] === 'undefined') {
      this[i] = function(method) { return function() {
        return stream[method].apply(stream, arguments);
      }}(i);
    }
  }

  // proxy certain important events.
  var events = ['error', 'close', 'destroy', 'pause', 'resume'];
  forEach(events, function(ev) {
    stream.on(ev, function (x) {
      return self.emit.apply(self, ev, x);
    });
  });

  // when we try to consume some more bytes, simply unpause the
  // underlying stream.
  self._read = function(n) {
    if (paused) {
      paused = false;
      stream.resume();
    }
  };

  return self;
};



// exposed for testing purposes only.
Readable._fromList = fromList;

// Pluck off n bytes from an array of buffers.
// Length is the combined lengths of all the buffers in the list.
function fromList(n, state) {
  var list = state.buffer;
  var length = state.length;
  var stringMode = !!state.decoder;
  var objectMode = !!state.objectMode;
  var ret;

  // nothing in the list, definitely empty.
  if (list.length === 0)
    return null;

  if (length === 0)
    ret = null;
  else if (objectMode)
    ret = list.shift();
  else if (!n || n >= length) {
    // read it all, truncate the array.
    if (stringMode)
      ret = list.join('');
    else
      ret = Buffer.concat(list, length);
    list.length = 0;
  } else {
    // read just some of it.
    if (n < list[0].length) {
      // just take a part of the first list item.
      // slice is the same for buffers and strings.
      var buf = list[0];
      ret = buf.slice(0, n);
      list[0] = buf.slice(n);
    } else if (n === list[0].length) {
      // first list is a perfect match
      ret = list.shift();
    } else {
      // complex case.
      // we have enough to cover it, but it spans past the first buffer.
      if (stringMode)
        ret = '';
      else
        ret = new Buffer(n);

      var c = 0;
      for (var i = 0, l = list.length; i < l && c < n; i++) {
        var buf = list[0];
        var cpy = Math.min(n - c, buf.length);

        if (stringMode)
          ret += buf.slice(0, cpy);
        else
          buf.copy(ret, c, 0, cpy);

        if (cpy < buf.length)
          list[0] = buf.slice(cpy);
        else
          list.shift();

        c += cpy;
      }
    }
  }

  return ret;
}

function endReadable(stream) {
  var state = stream._readableState;

  // If we get here before consuming all the bytes, then that is a
  // bug in node.  Should never happen.
  if (state.length > 0)
    throw new Error('endReadable called on non-empty stream');

  if (!state.endEmitted && state.calledRead) {
    state.ended = true;
    setImmediate(function() {
      // Check that we didn't get one last unshift.
      if (!state.endEmitted && state.length === 0) {
        state.endEmitted = true;
        stream.readable = false;
        stream.emit('end');
      }
    });
  }
}

function forEach (xs, f) {
  for (var i = 0, l = xs.length; i < l; i++) {
    f(xs[i], i);
  }
}

function indexOf (xs, x) {
  for (var i = 0, l = xs.length; i < l; i++) {
    if (xs[i] === x) return i;
  }
  return -1;
}

}).call(this,_dereq_("/Users/bartek/src/pdfmake/node_modules/grunt-browserify/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js"))
},{"./index.js":8,"/Users/bartek/src/pdfmake/node_modules/grunt-browserify/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js":6,"buffer":1,"events":4,"inherits":5,"process/browser.js":9,"string_decoder":14}],12:[function(_dereq_,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// a transform stream is a readable/writable stream where you do
// something with the data.  Sometimes it's called a "filter",
// but that's not a great name for it, since that implies a thing where
// some bits pass through, and others are simply ignored.  (That would
// be a valid example of a transform, of course.)
//
// While the output is causally related to the input, it's not a
// necessarily symmetric or synchronous transformation.  For example,
// a zlib stream might take multiple plain-text writes(), and then
// emit a single compressed chunk some time in the future.
//
// Here's how this works:
//
// The Transform stream has all the aspects of the readable and writable
// stream classes.  When you write(chunk), that calls _write(chunk,cb)
// internally, and returns false if there's a lot of pending writes
// buffered up.  When you call read(), that calls _read(n) until
// there's enough pending readable data buffered up.
//
// In a transform stream, the written data is placed in a buffer.  When
// _read(n) is called, it transforms the queued up data, calling the
// buffered _write cb's as it consumes chunks.  If consuming a single
// written chunk would result in multiple output chunks, then the first
// outputted bit calls the readcb, and subsequent chunks just go into
// the read buffer, and will cause it to emit 'readable' if necessary.
//
// This way, back-pressure is actually determined by the reading side,
// since _read has to be called to start processing a new chunk.  However,
// a pathological inflate type of transform can cause excessive buffering
// here.  For example, imagine a stream where every byte of input is
// interpreted as an integer from 0-255, and then results in that many
// bytes of output.  Writing the 4 bytes {ff,ff,ff,ff} would result in
// 1kb of data being output.  In this case, you could write a very small
// amount of input, and end up with a very large amount of output.  In
// such a pathological inflating mechanism, there'd be no way to tell
// the system to stop doing the transform.  A single 4MB write could
// cause the system to run out of memory.
//
// However, even in such a pathological case, only a single written chunk
// would be consumed, and then the rest would wait (un-transformed) until
// the results of the previous transformed chunk were consumed.

module.exports = Transform;

var Duplex = _dereq_('./duplex.js');
var inherits = _dereq_('inherits');
inherits(Transform, Duplex);


function TransformState(options, stream) {
  this.afterTransform = function(er, data) {
    return afterTransform(stream, er, data);
  };

  this.needTransform = false;
  this.transforming = false;
  this.writecb = null;
  this.writechunk = null;
}

function afterTransform(stream, er, data) {
  var ts = stream._transformState;
  ts.transforming = false;

  var cb = ts.writecb;

  if (!cb)
    return stream.emit('error', new Error('no writecb in Transform class'));

  ts.writechunk = null;
  ts.writecb = null;

  if (data !== null && data !== undefined)
    stream.push(data);

  if (cb)
    cb(er);

  var rs = stream._readableState;
  rs.reading = false;
  if (rs.needReadable || rs.length < rs.highWaterMark) {
    stream._read(rs.highWaterMark);
  }
}


function Transform(options) {
  if (!(this instanceof Transform))
    return new Transform(options);

  Duplex.call(this, options);

  var ts = this._transformState = new TransformState(options, this);

  // when the writable side finishes, then flush out anything remaining.
  var stream = this;

  // start out asking for a readable event once data is transformed.
  this._readableState.needReadable = true;

  // we have implemented the _read method, and done the other things
  // that Readable wants before the first _read call, so unset the
  // sync guard flag.
  this._readableState.sync = false;

  this.once('finish', function() {
    if ('function' === typeof this._flush)
      this._flush(function(er) {
        done(stream, er);
      });
    else
      done(stream);
  });
}

Transform.prototype.push = function(chunk, encoding) {
  this._transformState.needTransform = false;
  return Duplex.prototype.push.call(this, chunk, encoding);
};

// This is the part where you do stuff!
// override this function in implementation classes.
// 'chunk' is an input chunk.
//
// Call `push(newChunk)` to pass along transformed output
// to the readable side.  You may call 'push' zero or more times.
//
// Call `cb(err)` when you are done with this chunk.  If you pass
// an error, then that'll put the hurt on the whole operation.  If you
// never call cb(), then you'll never get another chunk.
Transform.prototype._transform = function(chunk, encoding, cb) {
  throw new Error('not implemented');
};

Transform.prototype._write = function(chunk, encoding, cb) {
  var ts = this._transformState;
  ts.writecb = cb;
  ts.writechunk = chunk;
  ts.writeencoding = encoding;
  if (!ts.transforming) {
    var rs = this._readableState;
    if (ts.needTransform ||
        rs.needReadable ||
        rs.length < rs.highWaterMark)
      this._read(rs.highWaterMark);
  }
};

// Doesn't matter what the args are here.
// _transform does all the work.
// That we got here means that the readable side wants more data.
Transform.prototype._read = function(n) {
  var ts = this._transformState;

  if (ts.writechunk && ts.writecb && !ts.transforming) {
    ts.transforming = true;
    this._transform(ts.writechunk, ts.writeencoding, ts.afterTransform);
  } else {
    // mark that we need a transform, so that any data that comes in
    // will get processed, now that we've asked for it.
    ts.needTransform = true;
  }
};


function done(stream, er) {
  if (er)
    return stream.emit('error', er);

  // if there's nothing in the write buffer, then that means
  // that nothing more will ever be provided
  var ws = stream._writableState;
  var rs = stream._readableState;
  var ts = stream._transformState;

  if (ws.length)
    throw new Error('calling transform done when ws.length != 0');

  if (ts.transforming)
    throw new Error('calling transform done when still transforming');

  return stream.push(null);
}

},{"./duplex.js":7,"inherits":5}],13:[function(_dereq_,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// A bit simpler than readable streams.
// Implement an async ._write(chunk, cb), and it'll handle all
// the drain event emission and buffering.

module.exports = Writable;
Writable.WritableState = WritableState;

var isUint8Array = typeof Uint8Array !== 'undefined'
  ? function (x) { return x instanceof Uint8Array }
  : function (x) {
    return x && x.constructor && x.constructor.name === 'Uint8Array'
  }
;
var isArrayBuffer = typeof ArrayBuffer !== 'undefined'
  ? function (x) { return x instanceof ArrayBuffer }
  : function (x) {
    return x && x.constructor && x.constructor.name === 'ArrayBuffer'
  }
;

var inherits = _dereq_('inherits');
var Stream = _dereq_('./index.js');
var setImmediate = _dereq_('process/browser.js').nextTick;
var Buffer = _dereq_('buffer').Buffer;

inherits(Writable, Stream);

function WriteReq(chunk, encoding, cb) {
  this.chunk = chunk;
  this.encoding = encoding;
  this.callback = cb;
}

function WritableState(options, stream) {
  options = options || {};

  // the point at which write() starts returning false
  // Note: 0 is a valid value, means that we always return false if
  // the entire buffer is not flushed immediately on write()
  var hwm = options.highWaterMark;
  this.highWaterMark = (hwm || hwm === 0) ? hwm : 16 * 1024;

  // object stream flag to indicate whether or not this stream
  // contains buffers or objects.
  this.objectMode = !!options.objectMode;

  // cast to ints.
  this.highWaterMark = ~~this.highWaterMark;

  this.needDrain = false;
  // at the start of calling end()
  this.ending = false;
  // when end() has been called, and returned
  this.ended = false;
  // when 'finish' is emitted
  this.finished = false;

  // should we decode strings into buffers before passing to _write?
  // this is here so that some node-core streams can optimize string
  // handling at a lower level.
  var noDecode = options.decodeStrings === false;
  this.decodeStrings = !noDecode;

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = options.defaultEncoding || 'utf8';

  // not an actual buffer we keep track of, but a measurement
  // of how much we're waiting to get pushed to some underlying
  // socket or file.
  this.length = 0;

  // a flag to see when we're in the middle of a write.
  this.writing = false;

  // a flag to be able to tell if the onwrite cb is called immediately,
  // or on a later tick.  We set this to true at first, becuase any
  // actions that shouldn't happen until "later" should generally also
  // not happen before the first write call.
  this.sync = true;

  // a flag to know if we're processing previously buffered items, which
  // may call the _write() callback in the same tick, so that we don't
  // end up in an overlapped onwrite situation.
  this.bufferProcessing = false;

  // the callback that's passed to _write(chunk,cb)
  this.onwrite = function(er) {
    onwrite(stream, er);
  };

  // the callback that the user supplies to write(chunk,encoding,cb)
  this.writecb = null;

  // the amount that is being written when _write is called.
  this.writelen = 0;

  this.buffer = [];
}

function Writable(options) {
  // Writable ctor is applied to Duplexes, though they're not
  // instanceof Writable, they're instanceof Readable.
  if (!(this instanceof Writable) && !(this instanceof Stream.Duplex))
    return new Writable(options);

  this._writableState = new WritableState(options, this);

  // legacy.
  this.writable = true;

  Stream.call(this);
}

// Otherwise people can pipe Writable streams, which is just wrong.
Writable.prototype.pipe = function() {
  this.emit('error', new Error('Cannot pipe. Not readable.'));
};


function writeAfterEnd(stream, state, cb) {
  var er = new Error('write after end');
  // TODO: defer error events consistently everywhere, not just the cb
  stream.emit('error', er);
  setImmediate(function() {
    cb(er);
  });
}

// If we get something that is not a buffer, string, null, or undefined,
// and we're not in objectMode, then that's an error.
// Otherwise stream chunks are all considered to be of length=1, and the
// watermarks determine how many objects to keep in the buffer, rather than
// how many bytes or characters.
function validChunk(stream, state, chunk, cb) {
  var valid = true;
  if (!Buffer.isBuffer(chunk) &&
      'string' !== typeof chunk &&
      chunk !== null &&
      chunk !== undefined &&
      !state.objectMode) {
    var er = new TypeError('Invalid non-string/buffer chunk');
    stream.emit('error', er);
    setImmediate(function() {
      cb(er);
    });
    valid = false;
  }
  return valid;
}

Writable.prototype.write = function(chunk, encoding, cb) {
  var state = this._writableState;
  var ret = false;

  if (typeof encoding === 'function') {
    cb = encoding;
    encoding = null;
  }

  if (!Buffer.isBuffer(chunk) && isUint8Array(chunk))
    chunk = new Buffer(chunk);
  if (isArrayBuffer(chunk) && typeof Uint8Array !== 'undefined')
    chunk = new Buffer(new Uint8Array(chunk));
  
  if (Buffer.isBuffer(chunk))
    encoding = 'buffer';
  else if (!encoding)
    encoding = state.defaultEncoding;

  if (typeof cb !== 'function')
    cb = function() {};

  if (state.ended)
    writeAfterEnd(this, state, cb);
  else if (validChunk(this, state, chunk, cb))
    ret = writeOrBuffer(this, state, chunk, encoding, cb);

  return ret;
};

function decodeChunk(state, chunk, encoding) {
  if (!state.objectMode &&
      state.decodeStrings !== false &&
      typeof chunk === 'string') {
    chunk = new Buffer(chunk, encoding);
  }
  return chunk;
}

// if we're already writing something, then just put this
// in the queue, and wait our turn.  Otherwise, call _write
// If we return false, then we need a drain event, so set that flag.
function writeOrBuffer(stream, state, chunk, encoding, cb) {
  chunk = decodeChunk(state, chunk, encoding);
  var len = state.objectMode ? 1 : chunk.length;

  state.length += len;

  var ret = state.length < state.highWaterMark;
  state.needDrain = !ret;

  if (state.writing)
    state.buffer.push(new WriteReq(chunk, encoding, cb));
  else
    doWrite(stream, state, len, chunk, encoding, cb);

  return ret;
}

function doWrite(stream, state, len, chunk, encoding, cb) {
  state.writelen = len;
  state.writecb = cb;
  state.writing = true;
  state.sync = true;
  stream._write(chunk, encoding, state.onwrite);
  state.sync = false;
}

function onwriteError(stream, state, sync, er, cb) {
  if (sync)
    setImmediate(function() {
      cb(er);
    });
  else
    cb(er);

  stream.emit('error', er);
}

function onwriteStateUpdate(state) {
  state.writing = false;
  state.writecb = null;
  state.length -= state.writelen;
  state.writelen = 0;
}

function onwrite(stream, er) {
  var state = stream._writableState;
  var sync = state.sync;
  var cb = state.writecb;

  onwriteStateUpdate(state);

  if (er)
    onwriteError(stream, state, sync, er, cb);
  else {
    // Check if we're actually ready to finish, but don't emit yet
    var finished = needFinish(stream, state);

    if (!finished && !state.bufferProcessing && state.buffer.length)
      clearBuffer(stream, state);

    if (sync) {
      setImmediate(function() {
        afterWrite(stream, state, finished, cb);
      });
    } else {
      afterWrite(stream, state, finished, cb);
    }
  }
}

function afterWrite(stream, state, finished, cb) {
  if (!finished)
    onwriteDrain(stream, state);
  cb();
  if (finished)
    finishMaybe(stream, state);
}

// Must force callback to be called on nextTick, so that we don't
// emit 'drain' before the write() consumer gets the 'false' return
// value, and has a chance to attach a 'drain' listener.
function onwriteDrain(stream, state) {
  if (state.length === 0 && state.needDrain) {
    state.needDrain = false;
    stream.emit('drain');
  }
}


// if there's something in the buffer waiting, then process it
function clearBuffer(stream, state) {
  state.bufferProcessing = true;

  for (var c = 0; c < state.buffer.length; c++) {
    var entry = state.buffer[c];
    var chunk = entry.chunk;
    var encoding = entry.encoding;
    var cb = entry.callback;
    var len = state.objectMode ? 1 : chunk.length;

    doWrite(stream, state, len, chunk, encoding, cb);

    // if we didn't call the onwrite immediately, then
    // it means that we need to wait until it does.
    // also, that means that the chunk and cb are currently
    // being processed, so move the buffer counter past them.
    if (state.writing) {
      c++;
      break;
    }
  }

  state.bufferProcessing = false;
  if (c < state.buffer.length)
    state.buffer = state.buffer.slice(c);
  else
    state.buffer.length = 0;
}

Writable.prototype._write = function(chunk, encoding, cb) {
  cb(new Error('not implemented'));
};

Writable.prototype.end = function(chunk, encoding, cb) {
  var state = this._writableState;

  if (typeof chunk === 'function') {
    cb = chunk;
    chunk = null;
    encoding = null;
  } else if (typeof encoding === 'function') {
    cb = encoding;
    encoding = null;
  }

  if (typeof chunk !== 'undefined' && chunk !== null)
    this.write(chunk, encoding);

  // ignore unnecessary end() calls.
  if (!state.ending && !state.finished)
    endWritable(this, state, cb);
};


function needFinish(stream, state) {
  return (state.ending &&
          state.length === 0 &&
          !state.finished &&
          !state.writing);
}

function finishMaybe(stream, state) {
  var need = needFinish(stream, state);
  if (need) {
    state.finished = true;
    stream.emit('finish');
  }
  return need;
}

function endWritable(stream, state, cb) {
  state.ending = true;
  finishMaybe(stream, state);
  if (cb) {
    if (state.finished)
      setImmediate(cb);
    else
      stream.once('finish', cb);
  }
  state.ended = true;
}

},{"./index.js":8,"buffer":1,"inherits":5,"process/browser.js":9}],14:[function(_dereq_,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var Buffer = _dereq_('buffer').Buffer;

function assertEncoding(encoding) {
  if (encoding && !Buffer.isEncoding(encoding)) {
    throw new Error('Unknown encoding: ' + encoding);
  }
}

var StringDecoder = exports.StringDecoder = function(encoding) {
  this.encoding = (encoding || 'utf8').toLowerCase().replace(/[-_]/, '');
  assertEncoding(encoding);
  switch (this.encoding) {
    case 'utf8':
      // CESU-8 represents each of Surrogate Pair by 3-bytes
      this.surrogateSize = 3;
      break;
    case 'ucs2':
    case 'utf16le':
      // UTF-16 represents each of Surrogate Pair by 2-bytes
      this.surrogateSize = 2;
      this.detectIncompleteChar = utf16DetectIncompleteChar;
      break;
    case 'base64':
      // Base-64 stores 3 bytes in 4 chars, and pads the remainder.
      this.surrogateSize = 3;
      this.detectIncompleteChar = base64DetectIncompleteChar;
      break;
    default:
      this.write = passThroughWrite;
      return;
  }

  this.charBuffer = new Buffer(6);
  this.charReceived = 0;
  this.charLength = 0;
};


StringDecoder.prototype.write = function(buffer) {
  var charStr = '';
  var offset = 0;

  // if our last write ended with an incomplete multibyte character
  while (this.charLength) {
    // determine how many remaining bytes this buffer has to offer for this char
    var i = (buffer.length >= this.charLength - this.charReceived) ?
                this.charLength - this.charReceived :
                buffer.length;

    // add the new bytes to the char buffer
    buffer.copy(this.charBuffer, this.charReceived, offset, i);
    this.charReceived += (i - offset);
    offset = i;

    if (this.charReceived < this.charLength) {
      // still not enough chars in this buffer? wait for more ...
      return '';
    }

    // get the character that was split
    charStr = this.charBuffer.slice(0, this.charLength).toString(this.encoding);

    // lead surrogate (D800-DBFF) is also the incomplete character
    var charCode = charStr.charCodeAt(charStr.length - 1);
    if (charCode >= 0xD800 && charCode <= 0xDBFF) {
      this.charLength += this.surrogateSize;
      charStr = '';
      continue;
    }
    this.charReceived = this.charLength = 0;

    // if there are no more bytes in this buffer, just emit our char
    if (i == buffer.length) return charStr;

    // otherwise cut off the characters end from the beginning of this buffer
    buffer = buffer.slice(i, buffer.length);
    break;
  }

  var lenIncomplete = this.detectIncompleteChar(buffer);

  var end = buffer.length;
  if (this.charLength) {
    // buffer the incomplete character bytes we got
    buffer.copy(this.charBuffer, 0, buffer.length - lenIncomplete, end);
    this.charReceived = lenIncomplete;
    end -= lenIncomplete;
  }

  charStr += buffer.toString(this.encoding, 0, end);

  var end = charStr.length - 1;
  var charCode = charStr.charCodeAt(end);
  // lead surrogate (D800-DBFF) is also the incomplete character
  if (charCode >= 0xD800 && charCode <= 0xDBFF) {
    var size = this.surrogateSize;
    this.charLength += size;
    this.charReceived += size;
    this.charBuffer.copy(this.charBuffer, size, 0, size);
    this.charBuffer.write(charStr.charAt(charStr.length - 1), this.encoding);
    return charStr.substring(0, end);
  }

  // or just emit the charStr
  return charStr;
};

StringDecoder.prototype.detectIncompleteChar = function(buffer) {
  // determine how many bytes we have to check at the end of this buffer
  var i = (buffer.length >= 3) ? 3 : buffer.length;

  // Figure out if one of the last i bytes of our buffer announces an
  // incomplete char.
  for (; i > 0; i--) {
    var c = buffer[buffer.length - i];

    // See http://en.wikipedia.org/wiki/UTF-8#Description

    // 110XXXXX
    if (i == 1 && c >> 5 == 0x06) {
      this.charLength = 2;
      break;
    }

    // 1110XXXX
    if (i <= 2 && c >> 4 == 0x0E) {
      this.charLength = 3;
      break;
    }

    // 11110XXX
    if (i <= 3 && c >> 3 == 0x1E) {
      this.charLength = 4;
      break;
    }
  }

  return i;
};

StringDecoder.prototype.end = function(buffer) {
  var res = '';
  if (buffer && buffer.length)
    res = this.write(buffer);

  if (this.charReceived) {
    var cr = this.charReceived;
    var buf = this.charBuffer;
    var enc = this.encoding;
    res += buf.slice(0, cr).toString(enc);
  }

  return res;
};

function passThroughWrite(buffer) {
  return buffer.toString(this.encoding);
}

function utf16DetectIncompleteChar(buffer) {
  var incomplete = this.charReceived = buffer.length % 2;
  this.charLength = incomplete ? 2 : 0;
  return incomplete;
}

function base64DetectIncompleteChar(buffer) {
  var incomplete = this.charReceived = buffer.length % 3;
  this.charLength = incomplete ? 3 : 0;
  return incomplete;
}

},{"buffer":1}],15:[function(_dereq_,module,exports){
(function (Buffer){
var Zlib = module.exports = _dereq_('./zlib');

// the least I can do is make error messages for the rest of the node.js/zlib api.
// (thanks, dominictarr)
function error () {
  var m = [].slice.call(arguments).join(' ')
  throw new Error([
    m,
    'we accept pull requests',
    'http://github.com/brianloveswords/zlib-browserify'
    ].join('\n'))
}

;['createGzip'
, 'createGunzip'
, 'createDeflate'
, 'createDeflateRaw'
, 'createInflate'
, 'createInflateRaw'
, 'createUnzip'
, 'Gzip'
, 'Gunzip'
, 'Inflate'
, 'InflateRaw'
, 'Deflate'
, 'DeflateRaw'
, 'Unzip'
, 'inflateRaw'
, 'deflateRaw'].forEach(function (name) {
  Zlib[name] = function () {
    error('sorry,', name, 'is not implemented yet')
  }
});

var _deflate = Zlib.deflate;
var _gzip = Zlib.gzip;

Zlib.deflate = function deflate(stringOrBuffer, callback) {
  return _deflate(Buffer(stringOrBuffer), callback);
};
Zlib.gzip = function gzip(stringOrBuffer, callback) {
  return _gzip(Buffer(stringOrBuffer), callback);
};

}).call(this,_dereq_("buffer").Buffer)
},{"./zlib":16,"buffer":1}],16:[function(_dereq_,module,exports){
(function (process,Buffer){
/** @license zlib.js 0.1.7 2012 - imaya [ https://github.com/imaya/zlib.js ] The MIT License */(function() {'use strict';function q(b){throw b;}var t=void 0,u=!0;var A="undefined"!==typeof Uint8Array&&"undefined"!==typeof Uint16Array&&"undefined"!==typeof Uint32Array;function E(b,a){this.index="number"===typeof a?a:0;this.m=0;this.buffer=b instanceof(A?Uint8Array:Array)?b:new (A?Uint8Array:Array)(32768);2*this.buffer.length<=this.index&&q(Error("invalid index"));this.buffer.length<=this.index&&this.f()}E.prototype.f=function(){var b=this.buffer,a,c=b.length,d=new (A?Uint8Array:Array)(c<<1);if(A)d.set(b);else for(a=0;a<c;++a)d[a]=b[a];return this.buffer=d};
E.prototype.d=function(b,a,c){var d=this.buffer,f=this.index,e=this.m,g=d[f],k;c&&1<a&&(b=8<a?(G[b&255]<<24|G[b>>>8&255]<<16|G[b>>>16&255]<<8|G[b>>>24&255])>>32-a:G[b]>>8-a);if(8>a+e)g=g<<a|b,e+=a;else for(k=0;k<a;++k)g=g<<1|b>>a-k-1&1,8===++e&&(e=0,d[f++]=G[g],g=0,f===d.length&&(d=this.f()));d[f]=g;this.buffer=d;this.m=e;this.index=f};E.prototype.finish=function(){var b=this.buffer,a=this.index,c;0<this.m&&(b[a]<<=8-this.m,b[a]=G[b[a]],a++);A?c=b.subarray(0,a):(b.length=a,c=b);return c};
var aa=new (A?Uint8Array:Array)(256),J;for(J=0;256>J;++J){for(var N=J,Q=N,ba=7,N=N>>>1;N;N>>>=1)Q<<=1,Q|=N&1,--ba;aa[J]=(Q<<ba&255)>>>0}var G=aa;function R(b,a,c){var d,f="number"===typeof a?a:a=0,e="number"===typeof c?c:b.length;d=-1;for(f=e&7;f--;++a)d=d>>>8^S[(d^b[a])&255];for(f=e>>3;f--;a+=8)d=d>>>8^S[(d^b[a])&255],d=d>>>8^S[(d^b[a+1])&255],d=d>>>8^S[(d^b[a+2])&255],d=d>>>8^S[(d^b[a+3])&255],d=d>>>8^S[(d^b[a+4])&255],d=d>>>8^S[(d^b[a+5])&255],d=d>>>8^S[(d^b[a+6])&255],d=d>>>8^S[(d^b[a+7])&255];return(d^4294967295)>>>0}
var ga=[0,1996959894,3993919788,2567524794,124634137,1886057615,3915621685,2657392035,249268274,2044508324,3772115230,2547177864,162941995,2125561021,3887607047,2428444049,498536548,1789927666,4089016648,2227061214,450548861,1843258603,4107580753,2211677639,325883990,1684777152,4251122042,2321926636,335633487,1661365465,4195302755,2366115317,997073096,1281953886,3579855332,2724688242,1006888145,1258607687,3524101629,2768942443,901097722,1119000684,3686517206,2898065728,853044451,1172266101,3705015759,
2882616665,651767980,1373503546,3369554304,3218104598,565507253,1454621731,3485111705,3099436303,671266974,1594198024,3322730930,2970347812,795835527,1483230225,3244367275,3060149565,1994146192,31158534,2563907772,4023717930,1907459465,112637215,2680153253,3904427059,2013776290,251722036,2517215374,3775830040,2137656763,141376813,2439277719,3865271297,1802195444,476864866,2238001368,4066508878,1812370925,453092731,2181625025,4111451223,1706088902,314042704,2344532202,4240017532,1658658271,366619977,
2362670323,4224994405,1303535960,984961486,2747007092,3569037538,1256170817,1037604311,2765210733,3554079995,1131014506,879679996,2909243462,3663771856,1141124467,855842277,2852801631,3708648649,1342533948,654459306,3188396048,3373015174,1466479909,544179635,3110523913,3462522015,1591671054,702138776,2966460450,3352799412,1504918807,783551873,3082640443,3233442989,3988292384,2596254646,62317068,1957810842,3939845945,2647816111,81470997,1943803523,3814918930,2489596804,225274430,2053790376,3826175755,
2466906013,167816743,2097651377,4027552580,2265490386,503444072,1762050814,4150417245,2154129355,426522225,1852507879,4275313526,2312317920,282753626,1742555852,4189708143,2394877945,397917763,1622183637,3604390888,2714866558,953729732,1340076626,3518719985,2797360999,1068828381,1219638859,3624741850,2936675148,906185462,1090812512,3747672003,2825379669,829329135,1181335161,3412177804,3160834842,628085408,1382605366,3423369109,3138078467,570562233,1426400815,3317316542,2998733608,733239954,1555261956,
3268935591,3050360625,752459403,1541320221,2607071920,3965973030,1969922972,40735498,2617837225,3943577151,1913087877,83908371,2512341634,3803740692,2075208622,213261112,2463272603,3855990285,2094854071,198958881,2262029012,4057260610,1759359992,534414190,2176718541,4139329115,1873836001,414664567,2282248934,4279200368,1711684554,285281116,2405801727,4167216745,1634467795,376229701,2685067896,3608007406,1308918612,956543938,2808555105,3495958263,1231636301,1047427035,2932959818,3654703836,1088359270,
936918E3,2847714899,3736837829,1202900863,817233897,3183342108,3401237130,1404277552,615818150,3134207493,3453421203,1423857449,601450431,3009837614,3294710456,1567103746,711928724,3020668471,3272380065,1510334235,755167117],S=A?new Uint32Array(ga):ga;function ha(){};function ia(b){this.buffer=new (A?Uint16Array:Array)(2*b);this.length=0}ia.prototype.getParent=function(b){return 2*((b-2)/4|0)};ia.prototype.push=function(b,a){var c,d,f=this.buffer,e;c=this.length;f[this.length++]=a;for(f[this.length++]=b;0<c;)if(d=this.getParent(c),f[c]>f[d])e=f[c],f[c]=f[d],f[d]=e,e=f[c+1],f[c+1]=f[d+1],f[d+1]=e,c=d;else break;return this.length};
ia.prototype.pop=function(){var b,a,c=this.buffer,d,f,e;a=c[0];b=c[1];this.length-=2;c[0]=c[this.length];c[1]=c[this.length+1];for(e=0;;){f=2*e+2;if(f>=this.length)break;f+2<this.length&&c[f+2]>c[f]&&(f+=2);if(c[f]>c[e])d=c[e],c[e]=c[f],c[f]=d,d=c[e+1],c[e+1]=c[f+1],c[f+1]=d;else break;e=f}return{index:b,value:a,length:this.length}};function ja(b){var a=b.length,c=0,d=Number.POSITIVE_INFINITY,f,e,g,k,h,l,s,n,m;for(n=0;n<a;++n)b[n]>c&&(c=b[n]),b[n]<d&&(d=b[n]);f=1<<c;e=new (A?Uint32Array:Array)(f);g=1;k=0;for(h=2;g<=c;){for(n=0;n<a;++n)if(b[n]===g){l=0;s=k;for(m=0;m<g;++m)l=l<<1|s&1,s>>=1;for(m=l;m<f;m+=h)e[m]=g<<16|n;++k}++g;k<<=1;h<<=1}return[e,c,d]};function ma(b,a){this.k=na;this.F=0;this.input=A&&b instanceof Array?new Uint8Array(b):b;this.b=0;a&&(a.lazy&&(this.F=a.lazy),"number"===typeof a.compressionType&&(this.k=a.compressionType),a.outputBuffer&&(this.a=A&&a.outputBuffer instanceof Array?new Uint8Array(a.outputBuffer):a.outputBuffer),"number"===typeof a.outputIndex&&(this.b=a.outputIndex));this.a||(this.a=new (A?Uint8Array:Array)(32768))}var na=2,oa={NONE:0,L:1,t:na,X:3},pa=[],T;
for(T=0;288>T;T++)switch(u){case 143>=T:pa.push([T+48,8]);break;case 255>=T:pa.push([T-144+400,9]);break;case 279>=T:pa.push([T-256+0,7]);break;case 287>=T:pa.push([T-280+192,8]);break;default:q("invalid literal: "+T)}
ma.prototype.h=function(){var b,a,c,d,f=this.input;switch(this.k){case 0:c=0;for(d=f.length;c<d;){a=A?f.subarray(c,c+65535):f.slice(c,c+65535);c+=a.length;var e=a,g=c===d,k=t,h=t,l=t,s=t,n=t,m=this.a,p=this.b;if(A){for(m=new Uint8Array(this.a.buffer);m.length<=p+e.length+5;)m=new Uint8Array(m.length<<1);m.set(this.a)}k=g?1:0;m[p++]=k|0;h=e.length;l=~h+65536&65535;m[p++]=h&255;m[p++]=h>>>8&255;m[p++]=l&255;m[p++]=l>>>8&255;if(A)m.set(e,p),p+=e.length,m=m.subarray(0,p);else{s=0;for(n=e.length;s<n;++s)m[p++]=
e[s];m.length=p}this.b=p;this.a=m}break;case 1:var r=new E(A?new Uint8Array(this.a.buffer):this.a,this.b);r.d(1,1,u);r.d(1,2,u);var v=qa(this,f),x,O,y;x=0;for(O=v.length;x<O;x++)if(y=v[x],E.prototype.d.apply(r,pa[y]),256<y)r.d(v[++x],v[++x],u),r.d(v[++x],5),r.d(v[++x],v[++x],u);else if(256===y)break;this.a=r.finish();this.b=this.a.length;break;case na:var D=new E(A?new Uint8Array(this.a.buffer):this.a,this.b),Da,P,U,V,W,qb=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15],ca,Ea,da,Fa,ka,sa=Array(19),
Ga,X,la,B,Ha;Da=na;D.d(1,1,u);D.d(Da,2,u);P=qa(this,f);ca=ra(this.U,15);Ea=ta(ca);da=ra(this.T,7);Fa=ta(da);for(U=286;257<U&&0===ca[U-1];U--);for(V=30;1<V&&0===da[V-1];V--);var Ia=U,Ja=V,I=new (A?Uint32Array:Array)(Ia+Ja),w,K,z,ea,H=new (A?Uint32Array:Array)(316),F,C,L=new (A?Uint8Array:Array)(19);for(w=K=0;w<Ia;w++)I[K++]=ca[w];for(w=0;w<Ja;w++)I[K++]=da[w];if(!A){w=0;for(ea=L.length;w<ea;++w)L[w]=0}w=F=0;for(ea=I.length;w<ea;w+=K){for(K=1;w+K<ea&&I[w+K]===I[w];++K);z=K;if(0===I[w])if(3>z)for(;0<
z--;)H[F++]=0,L[0]++;else for(;0<z;)C=138>z?z:138,C>z-3&&C<z&&(C=z-3),10>=C?(H[F++]=17,H[F++]=C-3,L[17]++):(H[F++]=18,H[F++]=C-11,L[18]++),z-=C;else if(H[F++]=I[w],L[I[w]]++,z--,3>z)for(;0<z--;)H[F++]=I[w],L[I[w]]++;else for(;0<z;)C=6>z?z:6,C>z-3&&C<z&&(C=z-3),H[F++]=16,H[F++]=C-3,L[16]++,z-=C}b=A?H.subarray(0,F):H.slice(0,F);ka=ra(L,7);for(B=0;19>B;B++)sa[B]=ka[qb[B]];for(W=19;4<W&&0===sa[W-1];W--);Ga=ta(ka);D.d(U-257,5,u);D.d(V-1,5,u);D.d(W-4,4,u);for(B=0;B<W;B++)D.d(sa[B],3,u);B=0;for(Ha=b.length;B<
Ha;B++)if(X=b[B],D.d(Ga[X],ka[X],u),16<=X){B++;switch(X){case 16:la=2;break;case 17:la=3;break;case 18:la=7;break;default:q("invalid code: "+X)}D.d(b[B],la,u)}var Ka=[Ea,ca],La=[Fa,da],M,Ma,fa,va,Na,Oa,Pa,Qa;Na=Ka[0];Oa=Ka[1];Pa=La[0];Qa=La[1];M=0;for(Ma=P.length;M<Ma;++M)if(fa=P[M],D.d(Na[fa],Oa[fa],u),256<fa)D.d(P[++M],P[++M],u),va=P[++M],D.d(Pa[va],Qa[va],u),D.d(P[++M],P[++M],u);else if(256===fa)break;this.a=D.finish();this.b=this.a.length;break;default:q("invalid compression type")}return this.a};
function ua(b,a){this.length=b;this.N=a}
var wa=function(){function b(a){switch(u){case 3===a:return[257,a-3,0];case 4===a:return[258,a-4,0];case 5===a:return[259,a-5,0];case 6===a:return[260,a-6,0];case 7===a:return[261,a-7,0];case 8===a:return[262,a-8,0];case 9===a:return[263,a-9,0];case 10===a:return[264,a-10,0];case 12>=a:return[265,a-11,1];case 14>=a:return[266,a-13,1];case 16>=a:return[267,a-15,1];case 18>=a:return[268,a-17,1];case 22>=a:return[269,a-19,2];case 26>=a:return[270,a-23,2];case 30>=a:return[271,a-27,2];case 34>=a:return[272,
a-31,2];case 42>=a:return[273,a-35,3];case 50>=a:return[274,a-43,3];case 58>=a:return[275,a-51,3];case 66>=a:return[276,a-59,3];case 82>=a:return[277,a-67,4];case 98>=a:return[278,a-83,4];case 114>=a:return[279,a-99,4];case 130>=a:return[280,a-115,4];case 162>=a:return[281,a-131,5];case 194>=a:return[282,a-163,5];case 226>=a:return[283,a-195,5];case 257>=a:return[284,a-227,5];case 258===a:return[285,a-258,0];default:q("invalid length: "+a)}}var a=[],c,d;for(c=3;258>=c;c++)d=b(c),a[c]=d[2]<<24|d[1]<<
16|d[0];return a}(),xa=A?new Uint32Array(wa):wa;
function qa(b,a){function c(a,c){var b=a.N,d=[],e=0,f;f=xa[a.length];d[e++]=f&65535;d[e++]=f>>16&255;d[e++]=f>>24;var g;switch(u){case 1===b:g=[0,b-1,0];break;case 2===b:g=[1,b-2,0];break;case 3===b:g=[2,b-3,0];break;case 4===b:g=[3,b-4,0];break;case 6>=b:g=[4,b-5,1];break;case 8>=b:g=[5,b-7,1];break;case 12>=b:g=[6,b-9,2];break;case 16>=b:g=[7,b-13,2];break;case 24>=b:g=[8,b-17,3];break;case 32>=b:g=[9,b-25,3];break;case 48>=b:g=[10,b-33,4];break;case 64>=b:g=[11,b-49,4];break;case 96>=b:g=[12,b-
65,5];break;case 128>=b:g=[13,b-97,5];break;case 192>=b:g=[14,b-129,6];break;case 256>=b:g=[15,b-193,6];break;case 384>=b:g=[16,b-257,7];break;case 512>=b:g=[17,b-385,7];break;case 768>=b:g=[18,b-513,8];break;case 1024>=b:g=[19,b-769,8];break;case 1536>=b:g=[20,b-1025,9];break;case 2048>=b:g=[21,b-1537,9];break;case 3072>=b:g=[22,b-2049,10];break;case 4096>=b:g=[23,b-3073,10];break;case 6144>=b:g=[24,b-4097,11];break;case 8192>=b:g=[25,b-6145,11];break;case 12288>=b:g=[26,b-8193,12];break;case 16384>=
b:g=[27,b-12289,12];break;case 24576>=b:g=[28,b-16385,13];break;case 32768>=b:g=[29,b-24577,13];break;default:q("invalid distance")}f=g;d[e++]=f[0];d[e++]=f[1];d[e++]=f[2];var h,k;h=0;for(k=d.length;h<k;++h)m[p++]=d[h];v[d[0]]++;x[d[3]]++;r=a.length+c-1;n=null}var d,f,e,g,k,h={},l,s,n,m=A?new Uint16Array(2*a.length):[],p=0,r=0,v=new (A?Uint32Array:Array)(286),x=new (A?Uint32Array:Array)(30),O=b.F,y;if(!A){for(e=0;285>=e;)v[e++]=0;for(e=0;29>=e;)x[e++]=0}v[256]=1;d=0;for(f=a.length;d<f;++d){e=k=0;
for(g=3;e<g&&d+e!==f;++e)k=k<<8|a[d+e];h[k]===t&&(h[k]=[]);l=h[k];if(!(0<r--)){for(;0<l.length&&32768<d-l[0];)l.shift();if(d+3>=f){n&&c(n,-1);e=0;for(g=f-d;e<g;++e)y=a[d+e],m[p++]=y,++v[y];break}0<l.length?(s=ya(a,d,l),n?n.length<s.length?(y=a[d-1],m[p++]=y,++v[y],c(s,0)):c(n,-1):s.length<O?n=s:c(s,0)):n?c(n,-1):(y=a[d],m[p++]=y,++v[y])}l.push(d)}m[p++]=256;v[256]++;b.U=v;b.T=x;return A?m.subarray(0,p):m}
function ya(b,a,c){var d,f,e=0,g,k,h,l,s=b.length;k=0;l=c.length;a:for(;k<l;k++){d=c[l-k-1];g=3;if(3<e){for(h=e;3<h;h--)if(b[d+h-1]!==b[a+h-1])continue a;g=e}for(;258>g&&a+g<s&&b[d+g]===b[a+g];)++g;g>e&&(f=d,e=g);if(258===g)break}return new ua(e,a-f)}
function ra(b,a){var c=b.length,d=new ia(572),f=new (A?Uint8Array:Array)(c),e,g,k,h,l;if(!A)for(h=0;h<c;h++)f[h]=0;for(h=0;h<c;++h)0<b[h]&&d.push(h,b[h]);e=Array(d.length/2);g=new (A?Uint32Array:Array)(d.length/2);if(1===e.length)return f[d.pop().index]=1,f;h=0;for(l=d.length/2;h<l;++h)e[h]=d.pop(),g[h]=e[h].value;k=za(g,g.length,a);h=0;for(l=e.length;h<l;++h)f[e[h].index]=k[h];return f}
function za(b,a,c){function d(b){var c=h[b][l[b]];c===a?(d(b+1),d(b+1)):--g[c];++l[b]}var f=new (A?Uint16Array:Array)(c),e=new (A?Uint8Array:Array)(c),g=new (A?Uint8Array:Array)(a),k=Array(c),h=Array(c),l=Array(c),s=(1<<c)-a,n=1<<c-1,m,p,r,v,x;f[c-1]=a;for(p=0;p<c;++p)s<n?e[p]=0:(e[p]=1,s-=n),s<<=1,f[c-2-p]=(f[c-1-p]/2|0)+a;f[0]=e[0];k[0]=Array(f[0]);h[0]=Array(f[0]);for(p=1;p<c;++p)f[p]>2*f[p-1]+e[p]&&(f[p]=2*f[p-1]+e[p]),k[p]=Array(f[p]),h[p]=Array(f[p]);for(m=0;m<a;++m)g[m]=c;for(r=0;r<f[c-1];++r)k[c-
1][r]=b[r],h[c-1][r]=r;for(m=0;m<c;++m)l[m]=0;1===e[c-1]&&(--g[0],++l[c-1]);for(p=c-2;0<=p;--p){v=m=0;x=l[p+1];for(r=0;r<f[p];r++)v=k[p+1][x]+k[p+1][x+1],v>b[m]?(k[p][r]=v,h[p][r]=a,x+=2):(k[p][r]=b[m],h[p][r]=m,++m);l[p]=0;1===e[p]&&d(p)}return g}
function ta(b){var a=new (A?Uint16Array:Array)(b.length),c=[],d=[],f=0,e,g,k,h;e=0;for(g=b.length;e<g;e++)c[b[e]]=(c[b[e]]|0)+1;e=1;for(g=16;e<=g;e++)d[e]=f,f+=c[e]|0,f<<=1;e=0;for(g=b.length;e<g;e++){f=d[b[e]];d[b[e]]+=1;k=a[e]=0;for(h=b[e];k<h;k++)a[e]=a[e]<<1|f&1,f>>>=1}return a};function Aa(b,a){this.input=b;this.b=this.c=0;this.g={};a&&(a.flags&&(this.g=a.flags),"string"===typeof a.filename&&(this.filename=a.filename),"string"===typeof a.comment&&(this.w=a.comment),a.deflateOptions&&(this.l=a.deflateOptions));this.l||(this.l={})}
Aa.prototype.h=function(){var b,a,c,d,f,e,g,k,h=new (A?Uint8Array:Array)(32768),l=0,s=this.input,n=this.c,m=this.filename,p=this.w;h[l++]=31;h[l++]=139;h[l++]=8;b=0;this.g.fname&&(b|=Ba);this.g.fcomment&&(b|=Ca);this.g.fhcrc&&(b|=Ra);h[l++]=b;a=(Date.now?Date.now():+new Date)/1E3|0;h[l++]=a&255;h[l++]=a>>>8&255;h[l++]=a>>>16&255;h[l++]=a>>>24&255;h[l++]=0;h[l++]=Sa;if(this.g.fname!==t){g=0;for(k=m.length;g<k;++g)e=m.charCodeAt(g),255<e&&(h[l++]=e>>>8&255),h[l++]=e&255;h[l++]=0}if(this.g.comment){g=
0;for(k=p.length;g<k;++g)e=p.charCodeAt(g),255<e&&(h[l++]=e>>>8&255),h[l++]=e&255;h[l++]=0}this.g.fhcrc&&(c=R(h,0,l)&65535,h[l++]=c&255,h[l++]=c>>>8&255);this.l.outputBuffer=h;this.l.outputIndex=l;f=new ma(s,this.l);h=f.h();l=f.b;A&&(l+8>h.buffer.byteLength?(this.a=new Uint8Array(l+8),this.a.set(new Uint8Array(h.buffer)),h=this.a):h=new Uint8Array(h.buffer));d=R(s,t,t);h[l++]=d&255;h[l++]=d>>>8&255;h[l++]=d>>>16&255;h[l++]=d>>>24&255;k=s.length;h[l++]=k&255;h[l++]=k>>>8&255;h[l++]=k>>>16&255;h[l++]=
k>>>24&255;this.c=n;A&&l<h.length&&(this.a=h=h.subarray(0,l));return h};var Sa=255,Ra=2,Ba=8,Ca=16;function Y(b,a){this.o=[];this.p=32768;this.e=this.j=this.c=this.s=0;this.input=A?new Uint8Array(b):b;this.u=!1;this.q=Ta;this.K=!1;if(a||!(a={}))a.index&&(this.c=a.index),a.bufferSize&&(this.p=a.bufferSize),a.bufferType&&(this.q=a.bufferType),a.resize&&(this.K=a.resize);switch(this.q){case Ua:this.b=32768;this.a=new (A?Uint8Array:Array)(32768+this.p+258);break;case Ta:this.b=0;this.a=new (A?Uint8Array:Array)(this.p);this.f=this.S;this.z=this.O;this.r=this.Q;break;default:q(Error("invalid inflate mode"))}}
var Ua=0,Ta=1;
Y.prototype.i=function(){for(;!this.u;){var b=Z(this,3);b&1&&(this.u=u);b>>>=1;switch(b){case 0:var a=this.input,c=this.c,d=this.a,f=this.b,e=t,g=t,k=t,h=d.length,l=t;this.e=this.j=0;e=a[c++];e===t&&q(Error("invalid uncompressed block header: LEN (first byte)"));g=e;e=a[c++];e===t&&q(Error("invalid uncompressed block header: LEN (second byte)"));g|=e<<8;e=a[c++];e===t&&q(Error("invalid uncompressed block header: NLEN (first byte)"));k=e;e=a[c++];e===t&&q(Error("invalid uncompressed block header: NLEN (second byte)"));k|=
e<<8;g===~k&&q(Error("invalid uncompressed block header: length verify"));c+g>a.length&&q(Error("input buffer is broken"));switch(this.q){case Ua:for(;f+g>d.length;){l=h-f;g-=l;if(A)d.set(a.subarray(c,c+l),f),f+=l,c+=l;else for(;l--;)d[f++]=a[c++];this.b=f;d=this.f();f=this.b}break;case Ta:for(;f+g>d.length;)d=this.f({B:2});break;default:q(Error("invalid inflate mode"))}if(A)d.set(a.subarray(c,c+g),f),f+=g,c+=g;else for(;g--;)d[f++]=a[c++];this.c=c;this.b=f;this.a=d;break;case 1:this.r(Va,Wa);break;
case 2:Xa(this);break;default:q(Error("unknown BTYPE: "+b))}}return this.z()};
var Ya=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15],Za=A?new Uint16Array(Ya):Ya,$a=[3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258,258,258],ab=A?new Uint16Array($a):$a,bb=[0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0,0,0],cb=A?new Uint8Array(bb):bb,db=[1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577],eb=A?new Uint16Array(db):db,fb=[0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,
10,11,11,12,12,13,13],gb=A?new Uint8Array(fb):fb,hb=new (A?Uint8Array:Array)(288),$,ib;$=0;for(ib=hb.length;$<ib;++$)hb[$]=143>=$?8:255>=$?9:279>=$?7:8;var Va=ja(hb),jb=new (A?Uint8Array:Array)(30),kb,lb;kb=0;for(lb=jb.length;kb<lb;++kb)jb[kb]=5;var Wa=ja(jb);function Z(b,a){for(var c=b.j,d=b.e,f=b.input,e=b.c,g;d<a;)g=f[e++],g===t&&q(Error("input buffer is broken")),c|=g<<d,d+=8;g=c&(1<<a)-1;b.j=c>>>a;b.e=d-a;b.c=e;return g}
function mb(b,a){for(var c=b.j,d=b.e,f=b.input,e=b.c,g=a[0],k=a[1],h,l,s;d<k;){h=f[e++];if(h===t)break;c|=h<<d;d+=8}l=g[c&(1<<k)-1];s=l>>>16;b.j=c>>s;b.e=d-s;b.c=e;return l&65535}
function Xa(b){function a(a,b,c){var d,e,f,g;for(g=0;g<a;)switch(d=mb(this,b),d){case 16:for(f=3+Z(this,2);f--;)c[g++]=e;break;case 17:for(f=3+Z(this,3);f--;)c[g++]=0;e=0;break;case 18:for(f=11+Z(this,7);f--;)c[g++]=0;e=0;break;default:e=c[g++]=d}return c}var c=Z(b,5)+257,d=Z(b,5)+1,f=Z(b,4)+4,e=new (A?Uint8Array:Array)(Za.length),g,k,h,l;for(l=0;l<f;++l)e[Za[l]]=Z(b,3);g=ja(e);k=new (A?Uint8Array:Array)(c);h=new (A?Uint8Array:Array)(d);b.r(ja(a.call(b,c,g,k)),ja(a.call(b,d,g,h)))}
Y.prototype.r=function(b,a){var c=this.a,d=this.b;this.A=b;for(var f=c.length-258,e,g,k,h;256!==(e=mb(this,b));)if(256>e)d>=f&&(this.b=d,c=this.f(),d=this.b),c[d++]=e;else{g=e-257;h=ab[g];0<cb[g]&&(h+=Z(this,cb[g]));e=mb(this,a);k=eb[e];0<gb[e]&&(k+=Z(this,gb[e]));d>=f&&(this.b=d,c=this.f(),d=this.b);for(;h--;)c[d]=c[d++-k]}for(;8<=this.e;)this.e-=8,this.c--;this.b=d};
Y.prototype.Q=function(b,a){var c=this.a,d=this.b;this.A=b;for(var f=c.length,e,g,k,h;256!==(e=mb(this,b));)if(256>e)d>=f&&(c=this.f(),f=c.length),c[d++]=e;else{g=e-257;h=ab[g];0<cb[g]&&(h+=Z(this,cb[g]));e=mb(this,a);k=eb[e];0<gb[e]&&(k+=Z(this,gb[e]));d+h>f&&(c=this.f(),f=c.length);for(;h--;)c[d]=c[d++-k]}for(;8<=this.e;)this.e-=8,this.c--;this.b=d};
Y.prototype.f=function(){var b=new (A?Uint8Array:Array)(this.b-32768),a=this.b-32768,c,d,f=this.a;if(A)b.set(f.subarray(32768,b.length));else{c=0;for(d=b.length;c<d;++c)b[c]=f[c+32768]}this.o.push(b);this.s+=b.length;if(A)f.set(f.subarray(a,a+32768));else for(c=0;32768>c;++c)f[c]=f[a+c];this.b=32768;return f};
Y.prototype.S=function(b){var a,c=this.input.length/this.c+1|0,d,f,e,g=this.input,k=this.a;b&&("number"===typeof b.B&&(c=b.B),"number"===typeof b.M&&(c+=b.M));2>c?(d=(g.length-this.c)/this.A[2],e=258*(d/2)|0,f=e<k.length?k.length+e:k.length<<1):f=k.length*c;A?(a=new Uint8Array(f),a.set(k)):a=k;return this.a=a};
Y.prototype.z=function(){var b=0,a=this.a,c=this.o,d,f=new (A?Uint8Array:Array)(this.s+(this.b-32768)),e,g,k,h;if(0===c.length)return A?this.a.subarray(32768,this.b):this.a.slice(32768,this.b);e=0;for(g=c.length;e<g;++e){d=c[e];k=0;for(h=d.length;k<h;++k)f[b++]=d[k]}e=32768;for(g=this.b;e<g;++e)f[b++]=a[e];this.o=[];return this.buffer=f};
Y.prototype.O=function(){var b,a=this.b;A?this.K?(b=new Uint8Array(a),b.set(this.a.subarray(0,a))):b=this.a.subarray(0,a):(this.a.length>a&&(this.a.length=a),b=this.a);return this.buffer=b};function nb(b){this.input=b;this.c=0;this.G=[];this.R=!1}
nb.prototype.i=function(){for(var b=this.input.length;this.c<b;){var a=new ha,c=t,d=t,f=t,e=t,g=t,k=t,h=t,l=t,s=t,n=this.input,m=this.c;a.C=n[m++];a.D=n[m++];(31!==a.C||139!==a.D)&&q(Error("invalid file signature:"+a.C+","+a.D));a.v=n[m++];switch(a.v){case 8:break;default:q(Error("unknown compression method: "+a.v))}a.n=n[m++];l=n[m++]|n[m++]<<8|n[m++]<<16|n[m++]<<24;a.$=new Date(1E3*l);a.ba=n[m++];a.aa=n[m++];0<(a.n&4)&&(a.W=n[m++]|n[m++]<<8,m+=a.W);if(0<(a.n&Ba)){h=[];for(k=0;0<(g=n[m++]);)h[k++]=
String.fromCharCode(g);a.name=h.join("")}if(0<(a.n&Ca)){h=[];for(k=0;0<(g=n[m++]);)h[k++]=String.fromCharCode(g);a.w=h.join("")}0<(a.n&Ra)&&(a.P=R(n,0,m)&65535,a.P!==(n[m++]|n[m++]<<8)&&q(Error("invalid header crc16")));c=n[n.length-4]|n[n.length-3]<<8|n[n.length-2]<<16|n[n.length-1]<<24;n.length-m-4-4<512*c&&(e=c);d=new Y(n,{index:m,bufferSize:e});a.data=f=d.i();m=d.c;a.Y=s=(n[m++]|n[m++]<<8|n[m++]<<16|n[m++]<<24)>>>0;R(f,t,t)!==s&&q(Error("invalid CRC-32 checksum: 0x"+R(f,t,t).toString(16)+" / 0x"+
s.toString(16)));a.Z=c=(n[m++]|n[m++]<<8|n[m++]<<16|n[m++]<<24)>>>0;(f.length&4294967295)!==c&&q(Error("invalid input size: "+(f.length&4294967295)+" / "+c));this.G.push(a);this.c=m}this.R=u;var p=this.G,r,v,x=0,O=0,y;r=0;for(v=p.length;r<v;++r)O+=p[r].data.length;if(A){y=new Uint8Array(O);for(r=0;r<v;++r)y.set(p[r].data,x),x+=p[r].data.length}else{y=[];for(r=0;r<v;++r)y[r]=p[r].data;y=Array.prototype.concat.apply([],y)}return y};function ob(b){if("string"===typeof b){var a=b.split(""),c,d;c=0;for(d=a.length;c<d;c++)a[c]=(a[c].charCodeAt(0)&255)>>>0;b=a}for(var f=1,e=0,g=b.length,k,h=0;0<g;){k=1024<g?1024:g;g-=k;do f+=b[h++],e+=f;while(--k);f%=65521;e%=65521}return(e<<16|f)>>>0};function pb(b,a){var c,d;this.input=b;this.c=0;if(a||!(a={}))a.index&&(this.c=a.index),a.verify&&(this.V=a.verify);c=b[this.c++];d=b[this.c++];switch(c&15){case rb:this.method=rb;break;default:q(Error("unsupported compression method"))}0!==((c<<8)+d)%31&&q(Error("invalid fcheck flag:"+((c<<8)+d)%31));d&32&&q(Error("fdict flag is not supported"));this.J=new Y(b,{index:this.c,bufferSize:a.bufferSize,bufferType:a.bufferType,resize:a.resize})}
pb.prototype.i=function(){var b=this.input,a,c;a=this.J.i();this.c=this.J.c;this.V&&(c=(b[this.c++]<<24|b[this.c++]<<16|b[this.c++]<<8|b[this.c++])>>>0,c!==ob(a)&&q(Error("invalid adler-32 checksum")));return a};var rb=8;function sb(b,a){this.input=b;this.a=new (A?Uint8Array:Array)(32768);this.k=tb.t;var c={},d;if((a||!(a={}))&&"number"===typeof a.compressionType)this.k=a.compressionType;for(d in a)c[d]=a[d];c.outputBuffer=this.a;this.I=new ma(this.input,c)}var tb=oa;
sb.prototype.h=function(){var b,a,c,d,f,e,g,k=0;g=this.a;b=rb;switch(b){case rb:a=Math.LOG2E*Math.log(32768)-8;break;default:q(Error("invalid compression method"))}c=a<<4|b;g[k++]=c;switch(b){case rb:switch(this.k){case tb.NONE:f=0;break;case tb.L:f=1;break;case tb.t:f=2;break;default:q(Error("unsupported compression type"))}break;default:q(Error("invalid compression method"))}d=f<<6|0;g[k++]=d|31-(256*c+d)%31;e=ob(this.input);this.I.b=k;g=this.I.h();k=g.length;A&&(g=new Uint8Array(g.buffer),g.length<=
k+4&&(this.a=new Uint8Array(g.length+4),this.a.set(g),g=this.a),g=g.subarray(0,k+4));g[k++]=e>>24&255;g[k++]=e>>16&255;g[k++]=e>>8&255;g[k++]=e&255;return g};exports.deflate=ub;exports.deflateSync=vb;exports.inflate=wb;exports.inflateSync=xb;exports.gzip=yb;exports.gzipSync=zb;exports.gunzip=Ab;exports.gunzipSync=Bb;function ub(b,a,c){process.nextTick(function(){var d,f;try{f=vb(b,c)}catch(e){d=e}a(d,f)})}function vb(b,a){var c;c=(new sb(b)).h();a||(a={});return a.H?c:Cb(c)}function wb(b,a,c){process.nextTick(function(){var d,f;try{f=xb(b,c)}catch(e){d=e}a(d,f)})}
function xb(b,a){var c;b.subarray=b.slice;c=(new pb(b)).i();a||(a={});return a.noBuffer?c:Cb(c)}function yb(b,a,c){process.nextTick(function(){var d,f;try{f=zb(b,c)}catch(e){d=e}a(d,f)})}function zb(b,a){var c;b.subarray=b.slice;c=(new Aa(b)).h();a||(a={});return a.H?c:Cb(c)}function Ab(b,a,c){process.nextTick(function(){var d,f;try{f=Bb(b,c)}catch(e){d=e}a(d,f)})}function Bb(b,a){var c;b.subarray=b.slice;c=(new nb(b)).i();a||(a={});return a.H?c:Cb(c)}
function Cb(b){var a=new Buffer(b.length),c,d;c=0;for(d=b.length;c<d;++c)a[c]=b[c];return a};}).call(this); //@ sourceMappingURL=node-zlib.js.map

}).call(this,_dereq_("/Users/bartek/src/pdfmake/node_modules/grunt-browserify/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js"),_dereq_("buffer").Buffer)
},{"/Users/bartek/src/pdfmake/node_modules/grunt-browserify/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js":6,"buffer":1}],17:[function(_dereq_,module,exports){
// Generated by CoffeeScript 1.7.1
(function() {
  var Data;

  Data = (function() {
    function Data(data) {
      this.data = data != null ? data : [];
      this.pos = 0;
      this.length = this.data.length;
    }

    Data.prototype.readByte = function() {
      return this.data[this.pos++];
    };

    Data.prototype.writeByte = function(byte) {
      return this.data[this.pos++] = byte;
    };

    Data.prototype.byteAt = function(index) {
      return this.data[index];
    };

    Data.prototype.readBool = function() {
      return !!this.readByte();
    };

    Data.prototype.writeBool = function(val) {
      return this.writeByte(val ? 1 : 0);
    };

    Data.prototype.readUInt32 = function() {
      var b1, b2, b3, b4;
      b1 = this.readByte() << 24;
      b2 = this.readByte() << 16;
      b3 = this.readByte() << 8;
      b4 = this.readByte();
      return b1 | b2 | b3 | b4;
    };

    Data.prototype.writeUInt32 = function(val) {
      this.writeByte((val >>> 24) & 0xff);
      this.writeByte((val >> 16) & 0xff);
      this.writeByte((val >> 8) & 0xff);
      return this.writeByte(val & 0xff);
    };

    Data.prototype.readInt32 = function() {
      var int;
      int = this.readUInt32();
      if (int >= 0x80000000) {
        return int - 0x100000000;
      } else {
        return int;
      }
    };

    Data.prototype.writeInt32 = function(val) {
      if (val < 0) {
        val += 0x100000000;
      }
      return this.writeUInt32(val);
    };

    Data.prototype.readUInt16 = function() {
      var b1, b2;
      b1 = this.readByte() << 8;
      b2 = this.readByte();
      return b1 | b2;
    };

    Data.prototype.writeUInt16 = function(val) {
      this.writeByte((val >> 8) & 0xff);
      return this.writeByte(val & 0xff);
    };

    Data.prototype.readInt16 = function() {
      var int;
      int = this.readUInt16();
      if (int >= 0x8000) {
        return int - 0x10000;
      } else {
        return int;
      }
    };

    Data.prototype.writeInt16 = function(val) {
      if (val < 0) {
        val += 0x10000;
      }
      return this.writeUInt16(val);
    };

    Data.prototype.readString = function(length) {
      var i, ret, _i;
      ret = [];
      for (i = _i = 0; 0 <= length ? _i < length : _i > length; i = 0 <= length ? ++_i : --_i) {
        ret[i] = String.fromCharCode(this.readByte());
      }
      return ret.join('');
    };

    Data.prototype.writeString = function(val) {
      var i, _i, _ref, _results;
      _results = [];
      for (i = _i = 0, _ref = val.length; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
        _results.push(this.writeByte(val.charCodeAt(i)));
      }
      return _results;
    };

    Data.prototype.stringAt = function(pos, length) {
      this.pos = pos;
      return this.readString(length);
    };

    Data.prototype.readShort = function() {
      return this.readInt16();
    };

    Data.prototype.writeShort = function(val) {
      return this.writeInt16(val);
    };

    Data.prototype.readLongLong = function() {
      var b1, b2, b3, b4, b5, b6, b7, b8;
      b1 = this.readByte();
      b2 = this.readByte();
      b3 = this.readByte();
      b4 = this.readByte();
      b5 = this.readByte();
      b6 = this.readByte();
      b7 = this.readByte();
      b8 = this.readByte();
      if (b1 & 0x80) {
        return ((b1 ^ 0xff) * 0x100000000000000 + (b2 ^ 0xff) * 0x1000000000000 + (b3 ^ 0xff) * 0x10000000000 + (b4 ^ 0xff) * 0x100000000 + (b5 ^ 0xff) * 0x1000000 + (b6 ^ 0xff) * 0x10000 + (b7 ^ 0xff) * 0x100 + (b8 ^ 0xff) + 1) * -1;
      }
      return b1 * 0x100000000000000 + b2 * 0x1000000000000 + b3 * 0x10000000000 + b4 * 0x100000000 + b5 * 0x1000000 + b6 * 0x10000 + b7 * 0x100 + b8;
    };

    Data.prototype.writeLongLong = function(val) {
      var high, low;
      high = Math.floor(val / 0x100000000);
      low = val & 0xffffffff;
      this.writeByte((high >> 24) & 0xff);
      this.writeByte((high >> 16) & 0xff);
      this.writeByte((high >> 8) & 0xff);
      this.writeByte(high & 0xff);
      this.writeByte((low >> 24) & 0xff);
      this.writeByte((low >> 16) & 0xff);
      this.writeByte((low >> 8) & 0xff);
      return this.writeByte(low & 0xff);
    };

    Data.prototype.readInt = function() {
      return this.readInt32();
    };

    Data.prototype.writeInt = function(val) {
      return this.writeInt32(val);
    };

    Data.prototype.slice = function(start, end) {
      return this.data.slice(start, end);
    };

    Data.prototype.read = function(bytes) {
      var buf, i, _i;
      buf = [];
      for (i = _i = 0; 0 <= bytes ? _i < bytes : _i > bytes; i = 0 <= bytes ? ++_i : --_i) {
        buf.push(this.readByte());
      }
      return buf;
    };

    Data.prototype.write = function(bytes) {
      var byte, _i, _len, _results;
      _results = [];
      for (_i = 0, _len = bytes.length; _i < _len; _i++) {
        byte = bytes[_i];
        _results.push(this.writeByte(byte));
      }
      return _results;
    };

    return Data;

  })();

  module.exports = Data;

}).call(this);

},{}],18:[function(_dereq_,module,exports){
(function (Buffer){
// Generated by CoffeeScript 1.7.1

/*
PDFDocument - represents an entire PDF document
By Devon Govett
 */

(function() {
  var PDFDocument, PDFObject, PDFPage, PDFReference, fs, stream,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  stream = _dereq_('stream');

  fs = _dereq_('fs');

  PDFObject = _dereq_('./object');

  PDFReference = _dereq_('./reference');

  PDFPage = _dereq_('./page');

  PDFDocument = (function(_super) {
    var mixin;

    __extends(PDFDocument, _super);

    function PDFDocument(options) {
      var key, val, _ref, _ref1;
      this.options = options != null ? options : {};
      PDFDocument.__super__.constructor.apply(this, arguments);
      this.version = 1.3;
      this.compress = (_ref = this.options.compress) != null ? _ref : true;
      this._offsets = [];
      this._waiting = 0;
      this._ended = false;
      this._offset = 0;
      this._root = this.ref({
        Type: 'Catalog',
        Pages: this.ref({
          Type: 'Pages',
          Count: 0,
          Kids: []
        })
      });
      this.page = null;
      this.initColor();
      this.initVector();
      this.initFonts();
      this.initText();
      this.initImages();
      this.info = {
        Producer: 'PDFKit',
        Creator: 'PDFKit',
        CreationDate: new Date()
      };
      if (this.options.info) {
        _ref1 = this.options.info;
        for (key in _ref1) {
          val = _ref1[key];
          this.info[key] = val;
        }
      }
      this._write("%PDF-" + this.version);
      this._write("%\xFF\xFF\xFF\xFF");
      this.addPage();
    }

    mixin = function(name, methods) {
      var method, methods, _results;
//
      _results = [];
      for (name in methods) {
        method = methods[name];
        _results.push(PDFDocument.prototype[name] = method);
      }
      return _results;
    };

    mixin('color', _dereq_('./mixins/color.js'));

    mixin('vector', _dereq_('./mixins/vector.js'));

    mixin('fonts', _dereq_('./mixins/fonts.js'));

    mixin('text', _dereq_('./mixins/text.js'));

    mixin('images', _dereq_('./mixins/images.js'));

    mixin('annotations', _dereq_('./mixins/annotations.js'));

    PDFDocument.prototype.addPage = function(options) {
      var pages, _ref;
      if (options == null) {
        options = this.options;
      }
      if ((_ref = this.page) != null) {
        _ref.end();
      }
      this.page = new PDFPage(this, options);
      pages = this._root.data.Pages.data;
      pages.Kids.push(this.page.dictionary);
      pages.Count++;
      this.x = this.page.margins.left;
      this.y = this.page.margins.top;
      this._ctm = [1, 0, 0, 1, 0, 0];
      this.transform(1, 0, 0, -1, 0, this.page.height);
      return this;
    };

    PDFDocument.prototype.ref = function(data) {
      var ref;
      ref = new PDFReference(this, this._offsets.length + 1, data);
      this._offsets.push(null);
      this._waiting++;
      return ref;
    };

    PDFDocument.prototype._read = function() {};

    PDFDocument.prototype._write = function(data) {
      if (!Buffer.isBuffer(data)) {
        data = new Buffer(data + '\n', 'binary');
      }
      this.push(data);
      return this._offset += data.length;
    };

    PDFDocument.prototype.addContent = function(data) {
      this.page.write(data);
      return this;
    };

    PDFDocument.prototype._refEnd = function(ref) {
      this._offsets[ref.id - 1] = ref.offset;
      if (--this._waiting === 0 && this._ended) {
        this._finalize();
        return this._ended = false;
      }
    };

    PDFDocument.prototype.write = function(filename, fn) {
      var err;
      err = new Error('PDFDocument#write is deprecated, and will be removed in a future version of PDFKit. Please pipe the document into a Node stream.');
      console.warn(err.stack);
      this.pipe(fs.createWriteStream(filename));
      this.end();
      return this.once('end', fn);
    };

    PDFDocument.prototype.output = function(fn) {
      throw new Error('PDFDocument#output is deprecated, and has been removed from PDFKit. Please pipe the document into a Node stream.');
    };

    PDFDocument.prototype.end = function() {
      var font, key, name, val, _ref, _ref1;
      this.page.end();
      this._info = this.ref();
      _ref = this.info;
      for (key in _ref) {
        val = _ref[key];
        if (typeof val === 'string') {
          val = PDFObject.s(val, true);
        }
        this._info.data[key] = val;
      }
      this._info.end();
      _ref1 = this._fontFamilies;
      for (name in _ref1) {
        font = _ref1[name];
        font.embed();
      }
      this._root.end();
      this._root.data.Pages.end();
      if (this._waiting === 0) {
        return this._finalize();
      } else {
        return this._ended = true;
      }
    };

    PDFDocument.prototype._finalize = function(fn) {
      var offset, xRefOffset, _i, _len, _ref;
      xRefOffset = this._offset;
      this._write("xref");
      this._write("0 " + (this._offsets.length + 1));
      this._write("0000000000 65535 f ");
      _ref = this._offsets;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        offset = _ref[_i];
        offset = ('0000000000' + offset).slice(-10);
        this._write(offset + ' 00000 n ');
      }
      this._write('trailer');
      this._write(PDFObject.convert({
        Size: this._offsets.length,
        Root: this._root,
        Info: this._info
      }));
      this._write('startxref');
      this._write("" + xRefOffset);
      this._write('%%EOF');
      return this.push(null);
    };

    PDFDocument.prototype.toString = function() {
      return "[object PDFDocument]";
    };

    return PDFDocument;

  })(stream.Readable);

  PDFDocument.PDFImage = _dereq_('./image');

  PDFDocument.PDFReference = PDFReference;

  module.exports = PDFDocument;

}).call(this);

}).call(this,_dereq_("buffer").Buffer)
},{"./image":38,"./mixins/annotations.js":42,"./mixins/color.js":43,"./mixins/fonts.js":44,"./mixins/images.js":45,"./mixins/text.js":46,"./mixins/vector.js":47,"./object":48,"./page":49,"./reference":51,"buffer":1,"fs":"x/K9gc","stream":8}],19:[function(_dereq_,module,exports){
(function (__dirname){
// Generated by CoffeeScript 1.7.1

/*
PDFFont - embeds fonts in PDF documents
By Devon Govett
 */

(function() {
  var AFMFont, PDFFont, Subset, TTFFont, zlib,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  TTFFont = _dereq_('./font/ttf');

  AFMFont = _dereq_('./font/afm');

  Subset = _dereq_('./font/subset');

  zlib = _dereq_('zlib');

  PDFFont = (function() {
    var toUnicodeCmap;

    function PDFFont(document, filename, family, id) {
      var _ref;
      this.document = document;
      this.filename = filename;
      this.family = family;
      this.id = id;
      this.ref = this.document.ref();
      if (_ref = this.filename, __indexOf.call(this._standardFonts, _ref) >= 0) {
        this.isAFM = true;
        this.font = AFMFont.open(__dirname + ("/font/data/" + this.filename + ".afm"));
        this.registerAFM();
      } else if (/\.(ttf|ttc)$/i.test(this.filename)) {
        this.font = TTFFont.open(this.filename, this.family);
        this.subset = new Subset(this.font);
        this.registerTTF();
      } else if (/\.dfont$/i.test(this.filename)) {
        this.font = TTFFont.fromDFont(this.filename, this.family);
        this.subset = new Subset(this.font);
        this.registerTTF();
      } else {
        throw new Error('Not a supported font format or standard PDF font.');
      }
    }

    PDFFont.prototype.use = function(characters) {
      var _ref;
      return (_ref = this.subset) != null ? _ref.use(characters) : void 0;
    };

    PDFFont.prototype.embed = function() {
      if (this.isAFM) {
        return this.embedAFM();
      } else {
        return this.embedTTF();
      }
    };

    PDFFont.prototype.encode = function(text) {
      var _ref;
      if (this.isAFM) {
        return this.font.encodeText(text);
      } else {
        return ((_ref = this.subset) != null ? _ref.encodeText(text) : void 0) || text;
      }
    };

    PDFFont.prototype.registerTTF = function() {
      var e, hi, low, raw, _ref;
      this.scaleFactor = 1000.0 / this.font.head.unitsPerEm;
      this.bbox = (function() {
        var _i, _len, _ref, _results;
        _ref = this.font.bbox;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          e = _ref[_i];
          _results.push(Math.round(e * this.scaleFactor));
        }
        return _results;
      }).call(this);
      this.stemV = 0;
      if (this.font.post.exists) {
        raw = this.font.post.italic_angle;
        hi = raw >> 16;
        low = raw & 0xFF;
        if (hi & 0x8000 !== 0) {
          hi = -((hi ^ 0xFFFF) + 1);
        }
        this.italicAngle = +("" + hi + "." + low);
      } else {
        this.italicAngle = 0;
      }
      this.ascender = Math.round(this.font.ascender * this.scaleFactor);
      this.decender = Math.round(this.font.decender * this.scaleFactor);
      this.lineGap = Math.round(this.font.lineGap * this.scaleFactor);
      this.capHeight = (this.font.os2.exists && this.font.os2.capHeight) || this.ascender;
      this.xHeight = (this.font.os2.exists && this.font.os2.xHeight) || 0;
      this.familyClass = (this.font.os2.exists && this.font.os2.familyClass || 0) >> 8;
      this.isSerif = (_ref = this.familyClass) === 1 || _ref === 2 || _ref === 3 || _ref === 4 || _ref === 5 || _ref === 7;
      this.isScript = this.familyClass === 10;
      this.flags = 0;
      if (this.font.post.isFixedPitch) {
        this.flags |= 1 << 0;
      }
      if (this.isSerif) {
        this.flags |= 1 << 1;
      }
      if (this.isScript) {
        this.flags |= 1 << 3;
      }
      if (this.italicAngle !== 0) {
        this.flags |= 1 << 6;
      }
      this.flags |= 1 << 5;
      if (!this.font.cmap.unicode) {
        throw new Error('No unicode cmap for font');
      }
    };

    PDFFont.prototype.embedTTF = function() {
      var charWidths, cmap, code, data, descriptor, firstChar, fontfile, glyph;
      data = this.subset.encode();
      fontfile = this.document.ref();
      fontfile.write(data);
      fontfile.data.Length1 = fontfile.uncompressedLength;
      fontfile.end();
      descriptor = this.document.ref({
        Type: 'FontDescriptor',
        FontName: this.subset.postscriptName,
        FontFile2: fontfile,
        FontBBox: this.bbox,
        Flags: this.flags,
        StemV: this.stemV,
        ItalicAngle: this.italicAngle,
        Ascent: this.ascender,
        Descent: this.decender,
        CapHeight: this.capHeight,
        XHeight: this.xHeight
      });
      descriptor.end();
      firstChar = +Object.keys(this.subset.cmap)[0];
      charWidths = (function() {
        var _ref, _results;
        _ref = this.subset.cmap;
        _results = [];
        for (code in _ref) {
          glyph = _ref[code];
          _results.push(Math.round(this.font.widthOfGlyph(glyph)));
        }
        return _results;
      }).call(this);
      cmap = this.document.ref();
      cmap.end(toUnicodeCmap(this.subset.subset));
      this.ref.data = {
        Type: 'Font',
        BaseFont: this.subset.postscriptName,
        Subtype: 'TrueType',
        FontDescriptor: descriptor,
        FirstChar: firstChar,
        LastChar: firstChar + charWidths.length - 1,
        Widths: charWidths,
        Encoding: 'MacRomanEncoding',
        ToUnicode: cmap
      };
      return this.ref.end();
    };

    toUnicodeCmap = function(map) {
      var code, codes, range, unicode, unicodeMap, _i, _len;
      unicodeMap = '/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n/CIDSystemInfo <<\n  /Registry (Adobe)\n  /Ordering (UCS)\n  /Supplement 0\n>> def\n/CMapName /Adobe-Identity-UCS def\n/CMapType 2 def\n1 begincodespacerange\n<00><ff>\nendcodespacerange';
      codes = Object.keys(map).sort(function(a, b) {
        return a - b;
      });
      range = [];
      for (_i = 0, _len = codes.length; _i < _len; _i++) {
        code = codes[_i];
        if (range.length >= 100) {
          unicodeMap += "\n" + range.length + " beginbfchar\n" + (range.join('\n')) + "\nendbfchar";
          range = [];
        }
        unicode = ('0000' + map[code].toString(16)).slice(-4);
        code = (+code).toString(16);
        range.push("<" + code + "><" + unicode + ">");
      }
      if (range.length) {
        unicodeMap += "\n" + range.length + " beginbfchar\n" + (range.join('\n')) + "\nendbfchar\n";
      }
      return unicodeMap += 'endcmap\nCMapName currentdict /CMap defineresource pop\nend\nend';
    };

    PDFFont.prototype.registerAFM = function() {
      var _ref;
      return _ref = this.font, this.ascender = _ref.ascender, this.decender = _ref.decender, this.bbox = _ref.bbox, this.lineGap = _ref.lineGap, _ref;
    };

    PDFFont.prototype.embedAFM = function() {
      this.ref.data = {
        Type: 'Font',
        BaseFont: this.filename,
        Subtype: 'Type1',
        Encoding: 'WinAnsiEncoding'
      };
      return this.ref.end();
    };

    PDFFont.prototype._standardFonts = ["Courier", "Courier-Bold", "Courier-Oblique", "Courier-BoldOblique", "Helvetica", "Helvetica-Bold", "Helvetica-Oblique", "Helvetica-BoldOblique", "Times-Roman", "Times-Bold", "Times-Italic", "Times-BoldItalic", "Symbol", "ZapfDingbats"];

    PDFFont.prototype.widthOfString = function(string, size) {
      var charCode, i, scale, width, _i, _ref;
      string = '' + string;
      width = 0;
      for (i = _i = 0, _ref = string.length; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
        charCode = string.charCodeAt(i);
        width += this.font.widthOfGlyph(this.font.characterToGlyph(charCode)) || 0;
      }
      scale = size / 1000;
      return width * scale;
    };

    PDFFont.prototype.lineHeight = function(size, includeGap) {
      var gap;
      if (includeGap == null) {
        includeGap = false;
      }
      gap = includeGap ? this.lineGap : 0;
      return (this.ascender + gap - this.decender) / 1000 * size;
    };

    return PDFFont;

  })();

  module.exports = PDFFont;

}).call(this);

}).call(this,"/../../node_modules/pdfmake-pdfkit/js")
},{"./font/afm":20,"./font/subset":23,"./font/ttf":35,"zlib":15}],20:[function(_dereq_,module,exports){
// Generated by CoffeeScript 1.7.1
(function() {
  var AFMFont, fs;

  fs = _dereq_('fs');

  AFMFont = (function() {
    var WIN_ANSI_MAP, characters;

    AFMFont.open = function(filename) {
      return new AFMFont(filename);
    };

    function AFMFont(filename) {
      var e, i;
      this.contents = fs.readFileSync(filename, 'utf8');
      this.attributes = {};
      this.glyphWidths = {};
      this.boundingBoxes = {};
      this.parse();
      this.charWidths = (function() {
        var _i, _results;
        _results = [];
        for (i = _i = 0; _i <= 255; i = ++_i) {
          _results.push(this.glyphWidths[characters[i]]);
        }
        return _results;
      }).call(this);
      this.bbox = (function() {
        var _i, _len, _ref, _results;
        _ref = this.attributes['FontBBox'].split(/\s+/);
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          e = _ref[_i];
          _results.push(+e);
        }
        return _results;
      }).call(this);
      this.ascender = +this.attributes['Ascender'];
      this.decender = +this.attributes['Descender'];
      this.lineGap = (this.bbox[3] - this.bbox[1]) - (this.ascender - this.decender);
    }

    AFMFont.prototype.parse = function() {
      var a, key, line, match, name, section, value, _i, _len, _ref;
      section = '';
      _ref = this.contents.split('\n');
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        line = _ref[_i];
        if (match = line.match(/^Start(\w+)/)) {
          section = match[1];
          continue;
        } else if (match = line.match(/^End(\w+)/)) {
          section = '';
          continue;
        }
        switch (section) {
          case 'FontMetrics':
            match = line.match(/(^\w+)\s+(.*)/);
            key = match[1];
            value = match[2];
            if (a = this.attributes[key]) {
              if (!Array.isArray(a)) {
                a = this.attributes[key] = [a];
              }
              a.push(value);
            } else {
              this.attributes[key] = value;
            }
            break;
          case 'CharMetrics':
            if (!/^CH?\s/.test(line)) {
              continue;
            }
            name = line.match(/\bN\s+(\.?\w+)\s*;/)[1];
            this.glyphWidths[name] = +line.match(/\bWX\s+(\d+)\s*;/)[1];
        }
      }
    };

    WIN_ANSI_MAP = {
      402: 131,
      8211: 150,
      8212: 151,
      8216: 145,
      8217: 146,
      8218: 130,
      8220: 147,
      8221: 148,
      8222: 132,
      8224: 134,
      8225: 135,
      8226: 149,
      8230: 133,
      8364: 128,
      8240: 137,
      8249: 139,
      8250: 155,
      710: 136,
      8482: 153,
      338: 140,
      339: 156,
      732: 152,
      352: 138,
      353: 154,
      376: 159,
      381: 142,
      382: 158
    };

    AFMFont.prototype.encodeText = function(text) {
      var char, i, string, _i, _ref;
      string = '';
      for (i = _i = 0, _ref = text.length; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
        char = text.charCodeAt(i);
        char = WIN_ANSI_MAP[char] || char;
        string += String.fromCharCode(char);
      }
      return string;
    };

    AFMFont.prototype.characterToGlyph = function(character) {
      return characters[WIN_ANSI_MAP[character] || character];
    };

    AFMFont.prototype.widthOfGlyph = function(glyph) {
      return this.glyphWidths[glyph];
    };

    characters = '.notdef       .notdef        .notdef        .notdef\n.notdef       .notdef        .notdef        .notdef\n.notdef       .notdef        .notdef        .notdef\n.notdef       .notdef        .notdef        .notdef\n.notdef       .notdef        .notdef        .notdef\n.notdef       .notdef        .notdef        .notdef\n.notdef       .notdef        .notdef        .notdef\n.notdef       .notdef        .notdef        .notdef\n\nspace         exclam         quotedbl       numbersign\ndollar        percent        ampersand      quotesingle\nparenleft     parenright     asterisk       plus\ncomma         hyphen         period         slash\nzero          one            two            three\nfour          five           six            seven\neight         nine           colon          semicolon\nless          equal          greater        question\n\nat            A              B              C\nD             E              F              G\nH             I              J              K\nL             M              N              O\nP             Q              R              S\nT             U              V              W\nX             Y              Z              bracketleft\nbackslash     bracketright   asciicircum    underscore\n\ngrave         a              b              c\nd             e              f              g\nh             i              j              k\nl             m              n              o\np             q              r              s\nt             u              v              w\nx             y              z              braceleft\nbar           braceright     asciitilde     .notdef\n\nEuro          .notdef        quotesinglbase florin\nquotedblbase  ellipsis       dagger         daggerdbl\ncircumflex    perthousand    Scaron         guilsinglleft\nOE            .notdef        Zcaron         .notdef\n.notdef       quoteleft      quoteright     quotedblleft\nquotedblright bullet         endash         emdash\ntilde         trademark      scaron         guilsinglright\noe            .notdef        zcaron         ydieresis\n\nspace         exclamdown     cent           sterling\ncurrency      yen            brokenbar      section\ndieresis      copyright      ordfeminine    guillemotleft\nlogicalnot    hyphen         registered     macron\ndegree        plusminus      twosuperior    threesuperior\nacute         mu             paragraph      periodcentered\ncedilla       onesuperior    ordmasculine   guillemotright\nonequarter    onehalf        threequarters  questiondown\n\nAgrave        Aacute         Acircumflex    Atilde\nAdieresis     Aring          AE             Ccedilla\nEgrave        Eacute         Ecircumflex    Edieresis\nIgrave        Iacute         Icircumflex    Idieresis\nEth           Ntilde         Ograve         Oacute\nOcircumflex   Otilde         Odieresis      multiply\nOslash        Ugrave         Uacute         Ucircumflex\nUdieresis     Yacute         Thorn          germandbls\n\nagrave        aacute         acircumflex    atilde\nadieresis     aring          ae             ccedilla\negrave        eacute         ecircumflex    edieresis\nigrave        iacute         icircumflex    idieresis\neth           ntilde         ograve         oacute\nocircumflex   otilde         odieresis      divide\noslash        ugrave         uacute         ucircumflex\nudieresis     yacute         thorn          ydieresis'.split(/\s+/);

    return AFMFont;

  })();

  module.exports = AFMFont;

}).call(this);

},{"fs":"x/K9gc"}],21:[function(_dereq_,module,exports){
// Generated by CoffeeScript 1.7.1
(function() {
  var DFont, Data, Directory, NameTable, fs;

  fs = _dereq_('fs');

  Data = _dereq_('../data');

  Directory = _dereq_('./directory');

  NameTable = _dereq_('./tables/name');

  DFont = (function() {
    DFont.open = function(filename) {
      var contents;
      contents = fs.readFileSync(filename);
      return new DFont(contents);
    };

    function DFont(contents) {
      this.contents = new Data(contents);
      this.parse(this.contents);
    }

    DFont.prototype.parse = function(data) {
      var attr, b2, b3, b4, dataLength, dataOffset, dataOfs, entry, font, handle, i, id, j, len, length, mapLength, mapOffset, maxIndex, maxTypeIndex, name, nameListOffset, nameOfs, p, pos, refListOffset, type, typeListOffset, _i, _j;
      dataOffset = data.readInt();
      mapOffset = data.readInt();
      dataLength = data.readInt();
      mapLength = data.readInt();
      this.map = {};
      data.pos = mapOffset + 24;
      typeListOffset = data.readShort() + mapOffset;
      nameListOffset = data.readShort() + mapOffset;
      data.pos = typeListOffset;
      maxIndex = data.readShort();
      for (i = _i = 0; _i <= maxIndex; i = _i += 1) {
        type = data.readString(4);
        maxTypeIndex = data.readShort();
        refListOffset = data.readShort();
        this.map[type] = {
          list: [],
          named: {}
        };
        pos = data.pos;
        data.pos = typeListOffset + refListOffset;
        for (j = _j = 0; _j <= maxTypeIndex; j = _j += 1) {
          id = data.readShort();
          nameOfs = data.readShort();
          attr = data.readByte();
          b2 = data.readByte() << 16;
          b3 = data.readByte() << 8;
          b4 = data.readByte();
          dataOfs = dataOffset + (0 | b2 | b3 | b4);
          handle = data.readUInt32();
          entry = {
            id: id,
            attributes: attr,
            offset: dataOfs,
            handle: handle
          };
          p = data.pos;
          if (nameOfs !== -1 && (nameListOffset + nameOfs < mapOffset + mapLength)) {
            data.pos = nameListOffset + nameOfs;
            len = data.readByte();
            entry.name = data.readString(len);
          } else if (type === 'sfnt') {
            data.pos = entry.offset;
            length = data.readUInt32();
            font = {};
            font.contents = new Data(data.slice(data.pos, data.pos + length));
            font.directory = new Directory(font.contents);
            name = new NameTable(font);
            entry.name = name.fontName[0].raw;
          }
          data.pos = p;
          this.map[type].list.push(entry);
          if (entry.name) {
            this.map[type].named[entry.name] = entry;
          }
        }
        data.pos = pos;
      }
    };

    DFont.prototype.getNamedFont = function(name) {
      var data, entry, length, pos, ret;
      data = this.contents;
      pos = data.pos;
      entry = this.map.sfnt.named[name];
      if (!entry) {
        throw new Error("Font " + name + " not found in DFont file.");
      }
      data.pos = entry.offset;
      length = data.readUInt32();
      ret = data.slice(data.pos, data.pos + length);
      data.pos = pos;
      return ret;
    };

    return DFont;

  })();

  module.exports = DFont;

}).call(this);

},{"../data":17,"./directory":22,"./tables/name":32,"fs":"x/K9gc"}],22:[function(_dereq_,module,exports){
(function (Buffer){
// Generated by CoffeeScript 1.7.1
(function() {
  var Data, Directory,
    __slice = [].slice;

  Data = _dereq_('../data');

  Directory = (function() {
    var checksum;

    function Directory(data) {
      var entry, i, _i, _ref;
      this.scalarType = data.readInt();
      this.tableCount = data.readShort();
      this.searchRange = data.readShort();
      this.entrySelector = data.readShort();
      this.rangeShift = data.readShort();
      this.tables = {};
      for (i = _i = 0, _ref = this.tableCount; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
        entry = {
          tag: data.readString(4),
          checksum: data.readInt(),
          offset: data.readInt(),
          length: data.readInt()
        };
        this.tables[entry.tag] = entry;
      }
    }

    Directory.prototype.encode = function(tables) {
      var adjustment, directory, directoryLength, entrySelector, headOffset, log2, offset, rangeShift, searchRange, sum, table, tableCount, tableData, tag;
      tableCount = Object.keys(tables).length;
      log2 = Math.log(2);
      searchRange = Math.floor(Math.log(tableCount) / log2) * 16;
      entrySelector = Math.floor(searchRange / log2);
      rangeShift = tableCount * 16 - searchRange;
      directory = new Data;
      directory.writeInt(this.scalarType);
      directory.writeShort(tableCount);
      directory.writeShort(searchRange);
      directory.writeShort(entrySelector);
      directory.writeShort(rangeShift);
      directoryLength = tableCount * 16;
      offset = directory.pos + directoryLength;
      headOffset = null;
      tableData = [];
      for (tag in tables) {
        table = tables[tag];
        directory.writeString(tag);
        directory.writeInt(checksum(table));
        directory.writeInt(offset);
        directory.writeInt(table.length);
        tableData = tableData.concat(table);
        if (tag === 'head') {
          headOffset = offset;
        }
        offset += table.length;
        while (offset % 4) {
          tableData.push(0);
          offset++;
        }
      }
      directory.write(tableData);
      sum = checksum(directory.data);
      adjustment = 0xB1B0AFBA - sum;
      directory.pos = headOffset + 8;
      directory.writeUInt32(adjustment);
      return new Buffer(directory.data);
    };

    checksum = function(data) {
      var i, sum, tmp, _i, _ref;
      data = __slice.call(data);
      while (data.length % 4) {
        data.push(0);
      }
      tmp = new Data(data);
      sum = 0;
      for (i = _i = 0, _ref = data.length; _i < _ref; i = _i += 4) {
        sum += tmp.readUInt32();
      }
      return sum & 0xFFFFFFFF;
    };

    return Directory;

  })();

  module.exports = Directory;

}).call(this);

}).call(this,_dereq_("buffer").Buffer)
},{"../data":17,"buffer":1}],23:[function(_dereq_,module,exports){
// Generated by CoffeeScript 1.7.1
(function() {
  var CmapTable, Subset, utils,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  CmapTable = _dereq_('./tables/cmap');

  utils = _dereq_('./utils');

  Subset = (function() {
    function Subset(font) {
      this.font = font;
      this.subset = {};
      this.unicodes = {};
      this.next = 33;
    }

    Subset.prototype.use = function(character) {
      var i, _i, _ref;
      if (typeof character === 'string') {
        for (i = _i = 0, _ref = character.length; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
          this.use(character.charCodeAt(i));
        }
        return;
      }
      if (!this.unicodes[character]) {
        this.subset[this.next] = character;
        return this.unicodes[character] = this.next++;
      }
    };

    Subset.prototype.encodeText = function(text) {
      var char, i, string, _i, _ref;
      string = '';
      for (i = _i = 0, _ref = text.length; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
        char = this.unicodes[text.charCodeAt(i)];
        string += String.fromCharCode(char);
      }
      return string;
    };

    Subset.prototype.cmap = function() {
      var mapping, roman, unicode, unicodeCmap, _ref;
      unicodeCmap = this.font.cmap.tables[0].codeMap;
      mapping = {};
      _ref = this.subset;
      for (roman in _ref) {
        unicode = _ref[roman];
        mapping[roman] = unicodeCmap[unicode];
      }
      return mapping;
    };

    Subset.prototype.glyphIDs = function() {
      var ret, roman, unicode, unicodeCmap, val, _ref;
      unicodeCmap = this.font.cmap.tables[0].codeMap;
      ret = [0];
      _ref = this.subset;
      for (roman in _ref) {
        unicode = _ref[roman];
        val = unicodeCmap[unicode];
        if ((val != null) && __indexOf.call(ret, val) < 0) {
          ret.push(val);
        }
      }
      return ret.sort();
    };

    Subset.prototype.glyphsFor = function(glyphIDs) {
      var additionalIDs, glyph, glyphs, id, _i, _len, _ref;
      glyphs = {};
      for (_i = 0, _len = glyphIDs.length; _i < _len; _i++) {
        id = glyphIDs[_i];
        glyphs[id] = this.font.glyf.glyphFor(id);
      }
      additionalIDs = [];
      for (id in glyphs) {
        glyph = glyphs[id];
        if (glyph != null ? glyph.compound : void 0) {
          additionalIDs.push.apply(additionalIDs, glyph.glyphIDs);
        }
      }
      if (additionalIDs.length > 0) {
        _ref = this.glyphsFor(additionalIDs);
        for (id in _ref) {
          glyph = _ref[id];
          glyphs[id] = glyph;
        }
      }
      return glyphs;
    };

    Subset.prototype.encode = function() {
      var cmap, code, glyf, glyphs, id, ids, loca, name, new2old, newIDs, nextGlyphID, old2new, oldID, oldIDs, tables, _ref, _ref1;
      cmap = CmapTable.encode(this.cmap(), 'unicode');
      glyphs = this.glyphsFor(this.glyphIDs());
      old2new = {
        0: 0
      };
      _ref = cmap.charMap;
      for (code in _ref) {
        ids = _ref[code];
        old2new[ids.old] = ids["new"];
      }
      nextGlyphID = cmap.maxGlyphID;
      for (oldID in glyphs) {
        if (!(oldID in old2new)) {
          old2new[oldID] = nextGlyphID++;
        }
      }
      new2old = utils.invert(old2new);
      newIDs = Object.keys(new2old).sort(function(a, b) {
        return a - b;
      });
      oldIDs = (function() {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = newIDs.length; _i < _len; _i++) {
          id = newIDs[_i];
          _results.push(new2old[id]);
        }
        return _results;
      })();
      glyf = this.font.glyf.encode(glyphs, oldIDs, old2new);
      loca = this.font.loca.encode(glyf.offsets);
      name = this.font.name.encode();
      this.postscriptName = name.postscriptName;
      this.cmap = {};
      _ref1 = cmap.charMap;
      for (code in _ref1) {
        ids = _ref1[code];
        this.cmap[code] = ids.old;
      }
      tables = {
        cmap: cmap.table,
        glyf: glyf.table,
        loca: loca.table,
        hmtx: this.font.hmtx.encode(oldIDs),
        hhea: this.font.hhea.encode(oldIDs),
        maxp: this.font.maxp.encode(oldIDs),
        post: this.font.post.encode(oldIDs),
        name: name.table,
        head: this.font.head.encode(loca)
      };
      if (this.font.os2.exists) {
        tables['OS/2'] = this.font.os2.raw();
      }
      return this.font.directory.encode(tables);
    };

    return Subset;

  })();

  module.exports = Subset;

}).call(this);

},{"./tables/cmap":25,"./utils":36}],24:[function(_dereq_,module,exports){
// Generated by CoffeeScript 1.7.1
(function() {
  var Table;

  Table = (function() {
    function Table(file, tag) {
      var info;
      this.file = file;
      this.tag = tag;
      if (this.tag == null) {
        this.tag = (this.constructor.name || this.constructor.toString().match(/function (.{1,})\(/)[1]).replace('Table', '').toLowerCase();
      }
      info = this.file.directory.tables[this.tag];
      this.exists = !!info;
      if (info) {
        this.offset = info.offset, this.length = info.length;
        this.parse(this.file.contents);
      }
    }

    Table.prototype.parse = function() {};

    Table.prototype.encode = function() {};

    Table.prototype.raw = function() {
      if (!this.exists) {
        return null;
      }
      this.file.contents.pos = this.offset;
      return this.file.contents.read(this.length);
    };

    return Table;

  })();

  module.exports = Table;

}).call(this);

},{}],25:[function(_dereq_,module,exports){
// Generated by CoffeeScript 1.7.1
(function() {
  var CmapEntry, CmapTable, Data, Table,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Table = _dereq_('../table');

  Data = _dereq_('../../data');

  CmapTable = (function(_super) {
    __extends(CmapTable, _super);

    function CmapTable() {
      return CmapTable.__super__.constructor.apply(this, arguments);
    }

    CmapTable.prototype.parse = function(data) {
      var entry, i, tableCount, _i;
      data.pos = this.offset;
      this.version = data.readUInt16();
      tableCount = data.readUInt16();
      this.tables = [];
      this.unicode = null;
      for (i = _i = 0; 0 <= tableCount ? _i < tableCount : _i > tableCount; i = 0 <= tableCount ? ++_i : --_i) {
        entry = new CmapEntry(data, this.offset);
        this.tables.push(entry);
        if (entry.isUnicode) {
          if (this.unicode == null) {
            this.unicode = entry;
          }
        }
      }
      return true;
    };

    CmapTable.encode = function(charmap, encoding) {
      var result, table;
      if (encoding == null) {
        encoding = 'macroman';
      }
      result = CmapEntry.encode(charmap, encoding);
      table = new Data;
      table.writeUInt16(0);
      table.writeUInt16(1);
      result.table = table.data.concat(result.subtable);
      return result;
    };

    return CmapTable;

  })(Table);

  CmapEntry = (function() {
    function CmapEntry(data, offset) {
      var code, count, endCode, glyphId, glyphIds, i, idDelta, idRangeOffset, index, segCount, segCountX2, start, startCode, tail, _i, _j, _k, _len;
      this.platformID = data.readUInt16();
      this.encodingID = data.readShort();
      this.offset = offset + data.readInt();
      data.pos = this.offset;
      this.format = data.readUInt16();
      this.length = data.readUInt16();
      this.language = data.readUInt16();
      this.isUnicode = (this.platformID === 3 && this.encodingID === 1 && this.format === 4) || this.platformID === 0 && this.format === 4;
      this.codeMap = {};
      switch (this.format) {
        case 0:
          for (i = _i = 0; _i < 256; i = ++_i) {
            this.codeMap[i] = data.readByte();
          }
          break;
        case 4:
          segCountX2 = data.readUInt16();
          segCount = segCountX2 / 2;
          data.pos += 6;
          endCode = (function() {
            var _j, _results;
            _results = [];
            for (i = _j = 0; 0 <= segCount ? _j < segCount : _j > segCount; i = 0 <= segCount ? ++_j : --_j) {
              _results.push(data.readUInt16());
            }
            return _results;
          })();
          data.pos += 2;
          startCode = (function() {
            var _j, _results;
            _results = [];
            for (i = _j = 0; 0 <= segCount ? _j < segCount : _j > segCount; i = 0 <= segCount ? ++_j : --_j) {
              _results.push(data.readUInt16());
            }
            return _results;
          })();
          idDelta = (function() {
            var _j, _results;
            _results = [];
            for (i = _j = 0; 0 <= segCount ? _j < segCount : _j > segCount; i = 0 <= segCount ? ++_j : --_j) {
              _results.push(data.readUInt16());
            }
            return _results;
          })();
          idRangeOffset = (function() {
            var _j, _results;
            _results = [];
            for (i = _j = 0; 0 <= segCount ? _j < segCount : _j > segCount; i = 0 <= segCount ? ++_j : --_j) {
              _results.push(data.readUInt16());
            }
            return _results;
          })();
          count = this.length - data.pos + this.offset;
          glyphIds = (function() {
            var _j, _results;
            _results = [];
            for (i = _j = 0; 0 <= count ? _j < count : _j > count; i = 0 <= count ? ++_j : --_j) {
              _results.push(data.readUInt16());
            }
            return _results;
          })();
          for (i = _j = 0, _len = endCode.length; _j < _len; i = ++_j) {
            tail = endCode[i];
            start = startCode[i];
            for (code = _k = start; start <= tail ? _k <= tail : _k >= tail; code = start <= tail ? ++_k : --_k) {
              if (idRangeOffset[i] === 0) {
                glyphId = code + idDelta[i];
              } else {
                index = idRangeOffset[i] / 2 + (code - start) - (segCount - i);
                glyphId = glyphIds[index] || 0;
                if (glyphId !== 0) {
                  glyphId += idDelta[i];
                }
              }
              this.codeMap[code] = glyphId & 0xFFFF;
            }
          }
      }
    }

    CmapEntry.encode = function(charmap, encoding) {
      var charMap, code, codeMap, codes, delta, deltas, diff, endCode, endCodes, entrySelector, glyphIDs, i, id, indexes, last, map, nextID, offset, old, rangeOffsets, rangeShift, result, searchRange, segCount, segCountX2, startCode, startCodes, startGlyph, subtable, _i, _j, _k, _l, _len, _len1, _len2, _len3, _len4, _len5, _len6, _len7, _m, _n, _name, _o, _p, _q;
      subtable = new Data;
      codes = Object.keys(charmap).sort(function(a, b) {
        return a - b;
      });
      switch (encoding) {
        case 'macroman':
          id = 0;
          indexes = (function() {
            var _i, _results;
            _results = [];
            for (i = _i = 0; _i < 256; i = ++_i) {
              _results.push(0);
            }
            return _results;
          })();
          map = {
            0: 0
          };
          codeMap = {};
          for (_i = 0, _len = codes.length; _i < _len; _i++) {
            code = codes[_i];
            if (map[_name = charmap[code]] == null) {
              map[_name] = ++id;
            }
            codeMap[code] = {
              old: charmap[code],
              "new": map[charmap[code]]
            };
            indexes[code] = map[charmap[code]];
          }
          subtable.writeUInt16(1);
          subtable.writeUInt16(0);
          subtable.writeUInt32(12);
          subtable.writeUInt16(0);
          subtable.writeUInt16(262);
          subtable.writeUInt16(0);
          subtable.write(indexes);
          return result = {
            charMap: codeMap,
            subtable: subtable.data,
            maxGlyphID: id + 1
          };
        case 'unicode':
          startCodes = [];
          endCodes = [];
          nextID = 0;
          map = {};
          charMap = {};
          last = diff = null;
          for (_j = 0, _len1 = codes.length; _j < _len1; _j++) {
            code = codes[_j];
            old = charmap[code];
            if (map[old] == null) {
              map[old] = ++nextID;
            }
            charMap[code] = {
              old: old,
              "new": map[old]
            };
            delta = map[old] - code;
            if ((last == null) || delta !== diff) {
              if (last) {
                endCodes.push(last);
              }
              startCodes.push(code);
              diff = delta;
            }
            last = code;
          }
          if (last) {
            endCodes.push(last);
          }
          endCodes.push(0xFFFF);
          startCodes.push(0xFFFF);
          segCount = startCodes.length;
          segCountX2 = segCount * 2;
          searchRange = 2 * Math.pow(Math.log(segCount) / Math.LN2, 2);
          entrySelector = Math.log(searchRange / 2) / Math.LN2;
          rangeShift = 2 * segCount - searchRange;
          deltas = [];
          rangeOffsets = [];
          glyphIDs = [];
          for (i = _k = 0, _len2 = startCodes.length; _k < _len2; i = ++_k) {
            startCode = startCodes[i];
            endCode = endCodes[i];
            if (startCode === 0xFFFF) {
              deltas.push(0);
              rangeOffsets.push(0);
              break;
            }
            startGlyph = charMap[startCode]["new"];
            if (startCode - startGlyph >= 0x8000) {
              deltas.push(0);
              rangeOffsets.push(2 * (glyphIDs.length + segCount - i));
              for (code = _l = startCode; startCode <= endCode ? _l <= endCode : _l >= endCode; code = startCode <= endCode ? ++_l : --_l) {
                glyphIDs.push(charMap[code]["new"]);
              }
            } else {
              deltas.push(startGlyph - startCode);
              rangeOffsets.push(0);
            }
          }
          subtable.writeUInt16(3);
          subtable.writeUInt16(1);
          subtable.writeUInt32(12);
          subtable.writeUInt16(4);
          subtable.writeUInt16(16 + segCount * 8 + glyphIDs.length * 2);
          subtable.writeUInt16(0);
          subtable.writeUInt16(segCountX2);
          subtable.writeUInt16(searchRange);
          subtable.writeUInt16(entrySelector);
          subtable.writeUInt16(rangeShift);
          for (_m = 0, _len3 = endCodes.length; _m < _len3; _m++) {
            code = endCodes[_m];
            subtable.writeUInt16(code);
          }
          subtable.writeUInt16(0);
          for (_n = 0, _len4 = startCodes.length; _n < _len4; _n++) {
            code = startCodes[_n];
            subtable.writeUInt16(code);
          }
          for (_o = 0, _len5 = deltas.length; _o < _len5; _o++) {
            delta = deltas[_o];
            subtable.writeUInt16(delta);
          }
          for (_p = 0, _len6 = rangeOffsets.length; _p < _len6; _p++) {
            offset = rangeOffsets[_p];
            subtable.writeUInt16(offset);
          }
          for (_q = 0, _len7 = glyphIDs.length; _q < _len7; _q++) {
            id = glyphIDs[_q];
            subtable.writeUInt16(id);
          }
          return result = {
            charMap: charMap,
            subtable: subtable.data,
            maxGlyphID: nextID + 1
          };
      }
    };

    return CmapEntry;

  })();

  module.exports = CmapTable;

}).call(this);

},{"../../data":17,"../table":24}],26:[function(_dereq_,module,exports){
// Generated by CoffeeScript 1.7.1
(function() {
  var CompoundGlyph, Data, GlyfTable, SimpleGlyph, Table,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    __slice = [].slice;

  Table = _dereq_('../table');

  Data = _dereq_('../../data');

  GlyfTable = (function(_super) {
    __extends(GlyfTable, _super);

    function GlyfTable() {
      return GlyfTable.__super__.constructor.apply(this, arguments);
    }

    GlyfTable.prototype.parse = function(data) {
      return this.cache = {};
    };

    GlyfTable.prototype.glyphFor = function(id) {
      var data, index, length, loca, numberOfContours, raw, xMax, xMin, yMax, yMin;
      if (id in this.cache) {
        return this.cache[id];
      }
      loca = this.file.loca;
      data = this.file.contents;
      index = loca.indexOf(id);
      length = loca.lengthOf(id);
      if (length === 0) {
        return this.cache[id] = null;
      }
      data.pos = this.offset + index;
      raw = new Data(data.read(length));
      numberOfContours = raw.readShort();
      xMin = raw.readShort();
      yMin = raw.readShort();
      xMax = raw.readShort();
      yMax = raw.readShort();
      if (numberOfContours === -1) {
        this.cache[id] = new CompoundGlyph(raw, xMin, yMin, xMax, yMax);
      } else {
        this.cache[id] = new SimpleGlyph(raw, numberOfContours, xMin, yMin, xMax, yMax);
      }
      return this.cache[id];
    };

    GlyfTable.prototype.encode = function(glyphs, mapping, old2new) {
      var glyph, id, offsets, table, _i, _len;
      table = [];
      offsets = [];
      for (_i = 0, _len = mapping.length; _i < _len; _i++) {
        id = mapping[_i];
        glyph = glyphs[id];
        offsets.push(table.length);
        if (glyph) {
          table = table.concat(glyph.encode(old2new));
        }
      }
      offsets.push(table.length);
      return {
        table: table,
        offsets: offsets
      };
    };

    return GlyfTable;

  })(Table);

  SimpleGlyph = (function() {
    function SimpleGlyph(raw, numberOfContours, xMin, yMin, xMax, yMax) {
      this.raw = raw;
      this.numberOfContours = numberOfContours;
      this.xMin = xMin;
      this.yMin = yMin;
      this.xMax = xMax;
      this.yMax = yMax;
      this.compound = false;
    }

    SimpleGlyph.prototype.encode = function() {
      return this.raw.data;
    };

    return SimpleGlyph;

  })();

  CompoundGlyph = (function() {
    var ARG_1_AND_2_ARE_WORDS, MORE_COMPONENTS, WE_HAVE_AN_X_AND_Y_SCALE, WE_HAVE_A_SCALE, WE_HAVE_A_TWO_BY_TWO, WE_HAVE_INSTRUCTIONS;

    ARG_1_AND_2_ARE_WORDS = 0x0001;

    WE_HAVE_A_SCALE = 0x0008;

    MORE_COMPONENTS = 0x0020;

    WE_HAVE_AN_X_AND_Y_SCALE = 0x0040;

    WE_HAVE_A_TWO_BY_TWO = 0x0080;

    WE_HAVE_INSTRUCTIONS = 0x0100;

    function CompoundGlyph(raw, xMin, yMin, xMax, yMax) {
      var data, flags;
      this.raw = raw;
      this.xMin = xMin;
      this.yMin = yMin;
      this.xMax = xMax;
      this.yMax = yMax;
      this.compound = true;
      this.glyphIDs = [];
      this.glyphOffsets = [];
      data = this.raw;
      while (true) {
        flags = data.readShort();
        this.glyphOffsets.push(data.pos);
        this.glyphIDs.push(data.readShort());
        if (!(flags & MORE_COMPONENTS)) {
          break;
        }
        if (flags & ARG_1_AND_2_ARE_WORDS) {
          data.pos += 4;
        } else {
          data.pos += 2;
        }
        if (flags & WE_HAVE_A_TWO_BY_TWO) {
          data.pos += 8;
        } else if (flags & WE_HAVE_AN_X_AND_Y_SCALE) {
          data.pos += 4;
        } else if (flags & WE_HAVE_A_SCALE) {
          data.pos += 2;
        }
      }
    }

    CompoundGlyph.prototype.encode = function(mapping) {
      var i, id, result, _i, _len, _ref;
      result = new Data(__slice.call(this.raw.data));
      _ref = this.glyphIDs;
      for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
        id = _ref[i];
        result.pos = this.glyphOffsets[i];
        result.writeShort(mapping[id]);
      }
      return result.data;
    };

    return CompoundGlyph;

  })();

  module.exports = GlyfTable;

}).call(this);

},{"../../data":17,"../table":24}],27:[function(_dereq_,module,exports){
// Generated by CoffeeScript 1.7.1
(function() {
  var Data, HeadTable, Table,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Table = _dereq_('../table');

  Data = _dereq_('../../data');

  HeadTable = (function(_super) {
    __extends(HeadTable, _super);

    function HeadTable() {
      return HeadTable.__super__.constructor.apply(this, arguments);
    }

    HeadTable.prototype.parse = function(data) {
      data.pos = this.offset;
      this.version = data.readInt();
      this.revision = data.readInt();
      this.checkSumAdjustment = data.readInt();
      this.magicNumber = data.readInt();
      this.flags = data.readShort();
      this.unitsPerEm = data.readShort();
      this.created = data.readLongLong();
      this.modified = data.readLongLong();
      this.xMin = data.readShort();
      this.yMin = data.readShort();
      this.xMax = data.readShort();
      this.yMax = data.readShort();
      this.macStyle = data.readShort();
      this.lowestRecPPEM = data.readShort();
      this.fontDirectionHint = data.readShort();
      this.indexToLocFormat = data.readShort();
      return this.glyphDataFormat = data.readShort();
    };

    HeadTable.prototype.encode = function(loca) {
      var table;
      table = new Data;
      table.writeInt(this.version);
      table.writeInt(this.revision);
      table.writeInt(this.checkSumAdjustment);
      table.writeInt(this.magicNumber);
      table.writeShort(this.flags);
      table.writeShort(this.unitsPerEm);
      table.writeLongLong(this.created);
      table.writeLongLong(this.modified);
      table.writeShort(this.xMin);
      table.writeShort(this.yMin);
      table.writeShort(this.xMax);
      table.writeShort(this.yMax);
      table.writeShort(this.macStyle);
      table.writeShort(this.lowestRecPPEM);
      table.writeShort(this.fontDirectionHint);
      table.writeShort(loca.type);
      table.writeShort(this.glyphDataFormat);
      return table.data;
    };

    return HeadTable;

  })(Table);

  module.exports = HeadTable;

}).call(this);

},{"../../data":17,"../table":24}],28:[function(_dereq_,module,exports){
// Generated by CoffeeScript 1.7.1
(function() {
  var Data, HheaTable, Table,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Table = _dereq_('../table');

  Data = _dereq_('../../data');

  HheaTable = (function(_super) {
    __extends(HheaTable, _super);

    function HheaTable() {
      return HheaTable.__super__.constructor.apply(this, arguments);
    }

    HheaTable.prototype.parse = function(data) {
      data.pos = this.offset;
      this.version = data.readInt();
      this.ascender = data.readShort();
      this.decender = data.readShort();
      this.lineGap = data.readShort();
      this.advanceWidthMax = data.readShort();
      this.minLeftSideBearing = data.readShort();
      this.minRightSideBearing = data.readShort();
      this.xMaxExtent = data.readShort();
      this.caretSlopeRise = data.readShort();
      this.caretSlopeRun = data.readShort();
      this.caretOffset = data.readShort();
      data.pos += 4 * 2;
      this.metricDataFormat = data.readShort();
      return this.numberOfMetrics = data.readUInt16();
    };

    HheaTable.prototype.encode = function(ids) {
      var i, table, _i, _ref;
      table = new Data;
      table.writeInt(this.version);
      table.writeShort(this.ascender);
      table.writeShort(this.decender);
      table.writeShort(this.lineGap);
      table.writeShort(this.advanceWidthMax);
      table.writeShort(this.minLeftSideBearing);
      table.writeShort(this.minRightSideBearing);
      table.writeShort(this.xMaxExtent);
      table.writeShort(this.caretSlopeRise);
      table.writeShort(this.caretSlopeRun);
      table.writeShort(this.caretOffset);
      for (i = _i = 0, _ref = 4 * 2; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
        table.writeByte(0);
      }
      table.writeShort(this.metricDataFormat);
      table.writeUInt16(ids.length);
      return table.data;
    };

    return HheaTable;

  })(Table);

  module.exports = HheaTable;

}).call(this);

},{"../../data":17,"../table":24}],29:[function(_dereq_,module,exports){
// Generated by CoffeeScript 1.7.1
(function() {
  var Data, HmtxTable, Table,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Table = _dereq_('../table');

  Data = _dereq_('../../data');

  HmtxTable = (function(_super) {
    __extends(HmtxTable, _super);

    function HmtxTable() {
      return HmtxTable.__super__.constructor.apply(this, arguments);
    }

    HmtxTable.prototype.parse = function(data) {
      var i, last, lsbCount, m, _i, _j, _ref, _results;
      data.pos = this.offset;
      this.metrics = [];
      for (i = _i = 0, _ref = this.file.hhea.numberOfMetrics; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
        this.metrics.push({
          advance: data.readUInt16(),
          lsb: data.readInt16()
        });
      }
      lsbCount = this.file.maxp.numGlyphs - this.file.hhea.numberOfMetrics;
      this.leftSideBearings = (function() {
        var _j, _results;
        _results = [];
        for (i = _j = 0; 0 <= lsbCount ? _j < lsbCount : _j > lsbCount; i = 0 <= lsbCount ? ++_j : --_j) {
          _results.push(data.readInt16());
        }
        return _results;
      })();
      this.widths = (function() {
        var _j, _len, _ref1, _results;
        _ref1 = this.metrics;
        _results = [];
        for (_j = 0, _len = _ref1.length; _j < _len; _j++) {
          m = _ref1[_j];
          _results.push(m.advance);
        }
        return _results;
      }).call(this);
      last = this.widths[this.widths.length - 1];
      _results = [];
      for (i = _j = 0; 0 <= lsbCount ? _j < lsbCount : _j > lsbCount; i = 0 <= lsbCount ? ++_j : --_j) {
        _results.push(this.widths.push(last));
      }
      return _results;
    };

    HmtxTable.prototype.forGlyph = function(id) {
      var metrics;
      if (id in this.metrics) {
        return this.metrics[id];
      }
      return metrics = {
        advance: this.metrics[this.metrics.length - 1].advance,
        lsb: this.leftSideBearings[id - this.metrics.length]
      };
    };

    HmtxTable.prototype.encode = function(mapping) {
      var id, metric, table, _i, _len;
      table = new Data;
      for (_i = 0, _len = mapping.length; _i < _len; _i++) {
        id = mapping[_i];
        metric = this.forGlyph(id);
        table.writeUInt16(metric.advance);
        table.writeUInt16(metric.lsb);
      }
      return table.data;
    };

    return HmtxTable;

  })(Table);

  module.exports = HmtxTable;

}).call(this);

},{"../../data":17,"../table":24}],30:[function(_dereq_,module,exports){
// Generated by CoffeeScript 1.7.1
(function() {
  var Data, LocaTable, Table,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Table = _dereq_('../table');

  Data = _dereq_('../../data');

  LocaTable = (function(_super) {
    __extends(LocaTable, _super);

    function LocaTable() {
      return LocaTable.__super__.constructor.apply(this, arguments);
    }

    LocaTable.prototype.parse = function(data) {
      var format, i;
      data.pos = this.offset;
      format = this.file.head.indexToLocFormat;
      if (format === 0) {
        return this.offsets = (function() {
          var _i, _ref, _results;
          _results = [];
          for (i = _i = 0, _ref = this.length; _i < _ref; i = _i += 2) {
            _results.push(data.readUInt16() * 2);
          }
          return _results;
        }).call(this);
      } else {
        return this.offsets = (function() {
          var _i, _ref, _results;
          _results = [];
          for (i = _i = 0, _ref = this.length; _i < _ref; i = _i += 4) {
            _results.push(data.readUInt32());
          }
          return _results;
        }).call(this);
      }
    };

    LocaTable.prototype.indexOf = function(id) {
      return this.offsets[id];
    };

    LocaTable.prototype.lengthOf = function(id) {
      return this.offsets[id + 1] - this.offsets[id];
    };

    LocaTable.prototype.encode = function(offsets) {
      var o, offset, ret, table, _i, _j, _k, _len, _len1, _len2, _ref;
      table = new Data;
      for (_i = 0, _len = offsets.length; _i < _len; _i++) {
        offset = offsets[_i];
        if (!(offset > 0xFFFF)) {
          continue;
        }
        _ref = this.offsets;
        for (_j = 0, _len1 = _ref.length; _j < _len1; _j++) {
          o = _ref[_j];
          table.writeUInt32(o);
        }
        return ret = {
          format: 1,
          table: table.data
        };
      }
      for (_k = 0, _len2 = offsets.length; _k < _len2; _k++) {
        o = offsets[_k];
        table.writeUInt16(o / 2);
      }
      return ret = {
        format: 0,
        table: table.data
      };
    };

    return LocaTable;

  })(Table);

  module.exports = LocaTable;

}).call(this);

},{"../../data":17,"../table":24}],31:[function(_dereq_,module,exports){
// Generated by CoffeeScript 1.7.1
(function() {
  var Data, MaxpTable, Table,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Table = _dereq_('../table');

  Data = _dereq_('../../data');

  MaxpTable = (function(_super) {
    __extends(MaxpTable, _super);

    function MaxpTable() {
      return MaxpTable.__super__.constructor.apply(this, arguments);
    }

    MaxpTable.prototype.parse = function(data) {
      data.pos = this.offset;
      this.version = data.readInt();
      this.numGlyphs = data.readUInt16();
      this.maxPoints = data.readUInt16();
      this.maxContours = data.readUInt16();
      this.maxCompositePoints = data.readUInt16();
      this.maxComponentContours = data.readUInt16();
      this.maxZones = data.readUInt16();
      this.maxTwilightPoints = data.readUInt16();
      this.maxStorage = data.readUInt16();
      this.maxFunctionDefs = data.readUInt16();
      this.maxInstructionDefs = data.readUInt16();
      this.maxStackElements = data.readUInt16();
      this.maxSizeOfInstructions = data.readUInt16();
      this.maxComponentElements = data.readUInt16();
      return this.maxComponentDepth = data.readUInt16();
    };

    MaxpTable.prototype.encode = function(ids) {
      var table;
      table = new Data;
      table.writeInt(this.version);
      table.writeUInt16(ids.length);
      table.writeUInt16(this.maxPoints);
      table.writeUInt16(this.maxContours);
      table.writeUInt16(this.maxCompositePoints);
      table.writeUInt16(this.maxComponentContours);
      table.writeUInt16(this.maxZones);
      table.writeUInt16(this.maxTwilightPoints);
      table.writeUInt16(this.maxStorage);
      table.writeUInt16(this.maxFunctionDefs);
      table.writeUInt16(this.maxInstructionDefs);
      table.writeUInt16(this.maxStackElements);
      table.writeUInt16(this.maxSizeOfInstructions);
      table.writeUInt16(this.maxComponentElements);
      table.writeUInt16(this.maxComponentDepth);
      return table.data;
    };

    return MaxpTable;

  })(Table);

  module.exports = MaxpTable;

}).call(this);

},{"../../data":17,"../table":24}],32:[function(_dereq_,module,exports){
// Generated by CoffeeScript 1.7.1
(function() {
  var Data, NameEntry, NameTable, Table, utils,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Table = _dereq_('../table');

  Data = _dereq_('../../data');

  utils = _dereq_('../utils');

  NameTable = (function(_super) {
    var subsetTag;

    __extends(NameTable, _super);

    function NameTable() {
      return NameTable.__super__.constructor.apply(this, arguments);
    }

    NameTable.prototype.parse = function(data) {
      var count, entries, entry, format, i, name, stringOffset, strings, text, _i, _j, _len, _name;
      data.pos = this.offset;
      format = data.readShort();
      count = data.readShort();
      stringOffset = data.readShort();
      entries = [];
      for (i = _i = 0; 0 <= count ? _i < count : _i > count; i = 0 <= count ? ++_i : --_i) {
        entries.push({
          platformID: data.readShort(),
          encodingID: data.readShort(),
          languageID: data.readShort(),
          nameID: data.readShort(),
          length: data.readShort(),
          offset: this.offset + stringOffset + data.readShort()
        });
      }
      strings = {};
      for (i = _j = 0, _len = entries.length; _j < _len; i = ++_j) {
        entry = entries[i];
        data.pos = entry.offset;
        text = data.readString(entry.length);
        name = new NameEntry(text, entry);
        if (strings[_name = entry.nameID] == null) {
          strings[_name] = [];
        }
        strings[entry.nameID].push(name);
      }
      this.strings = strings;
      this.copyright = strings[0];
      this.fontFamily = strings[1];
      this.fontSubfamily = strings[2];
      this.uniqueSubfamily = strings[3];
      this.fontName = strings[4];
      this.version = strings[5];
      this.postscriptName = strings[6][0].raw.replace(/[\x00-\x19\x80-\xff]/g, "");
      this.trademark = strings[7];
      this.manufacturer = strings[8];
      this.designer = strings[9];
      this.description = strings[10];
      this.vendorUrl = strings[11];
      this.designerUrl = strings[12];
      this.license = strings[13];
      this.licenseUrl = strings[14];
      this.preferredFamily = strings[15];
      this.preferredSubfamily = strings[17];
      this.compatibleFull = strings[18];
      return this.sampleText = strings[19];
    };

    subsetTag = "AAAAAA";

    NameTable.prototype.encode = function() {
      var id, list, nameID, nameTable, postscriptName, strCount, strTable, string, strings, table, val, _i, _len, _ref;
      strings = {};
      _ref = this.strings;
      for (id in _ref) {
        val = _ref[id];
        strings[id] = val;
      }
      postscriptName = new NameEntry("" + subsetTag + "+" + this.postscriptName, {
        platformID: 1,
        encodingID: 0,
        languageID: 0
      });
      strings[6] = [postscriptName];
      subsetTag = utils.successorOf(subsetTag);
      strCount = 0;
      for (id in strings) {
        list = strings[id];
        if (list != null) {
          strCount += list.length;
        }
      }
      table = new Data;
      strTable = new Data;
      table.writeShort(0);
      table.writeShort(strCount);
      table.writeShort(6 + 12 * strCount);
      for (nameID in strings) {
        list = strings[nameID];
        if (list != null) {
          for (_i = 0, _len = list.length; _i < _len; _i++) {
            string = list[_i];
            table.writeShort(string.platformID);
            table.writeShort(string.encodingID);
            table.writeShort(string.languageID);
            table.writeShort(nameID);
            table.writeShort(string.length);
            table.writeShort(strTable.pos);
            strTable.writeString(string.raw);
          }
        }
      }
      return nameTable = {
        postscriptName: postscriptName.raw,
        table: table.data.concat(strTable.data)
      };
    };

    return NameTable;

  })(Table);

  module.exports = NameTable;

  NameEntry = (function() {
    function NameEntry(raw, entry) {
      this.raw = raw;
      this.length = raw.length;
      this.platformID = entry.platformID;
      this.encodingID = entry.encodingID;
      this.languageID = entry.languageID;
    }

    return NameEntry;

  })();

}).call(this);

},{"../../data":17,"../table":24,"../utils":36}],33:[function(_dereq_,module,exports){
// Generated by CoffeeScript 1.7.1
(function() {
  var OS2Table, Table,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Table = _dereq_('../table');

  OS2Table = (function(_super) {
    __extends(OS2Table, _super);

    function OS2Table() {
      this.tag = 'OS/2';
      OS2Table.__super__.constructor.apply(this, arguments);
    }

    OS2Table.prototype.parse = function(data) {
      var i;
      data.pos = this.offset;
      this.version = data.readUInt16();
      this.averageCharWidth = data.readShort();
      this.weightClass = data.readUInt16();
      this.widthClass = data.readUInt16();
      this.type = data.readShort();
      this.ySubscriptXSize = data.readShort();
      this.ySubscriptYSize = data.readShort();
      this.ySubscriptXOffset = data.readShort();
      this.ySubscriptYOffset = data.readShort();
      this.ySuperscriptXSize = data.readShort();
      this.ySuperscriptYSize = data.readShort();
      this.ySuperscriptXOffset = data.readShort();
      this.ySuperscriptYOffset = data.readShort();
      this.yStrikeoutSize = data.readShort();
      this.yStrikeoutPosition = data.readShort();
      this.familyClass = data.readShort();
      this.panose = (function() {
        var _i, _results;
        _results = [];
        for (i = _i = 0; _i < 10; i = ++_i) {
          _results.push(data.readByte());
        }
        return _results;
      })();
      this.charRange = (function() {
        var _i, _results;
        _results = [];
        for (i = _i = 0; _i < 4; i = ++_i) {
          _results.push(data.readInt());
        }
        return _results;
      })();
      this.vendorID = data.readString(4);
      this.selection = data.readShort();
      this.firstCharIndex = data.readShort();
      this.lastCharIndex = data.readShort();
      if (this.version > 0) {
        this.ascent = data.readShort();
        this.descent = data.readShort();
        this.lineGap = data.readShort();
        this.winAscent = data.readShort();
        this.winDescent = data.readShort();
        this.codePageRange = (function() {
          var _i, _results;
          _results = [];
          for (i = _i = 0; _i < 2; i = ++_i) {
            _results.push(data.readInt());
          }
          return _results;
        })();
        if (this.version > 1) {
          this.xHeight = data.readShort();
          this.capHeight = data.readShort();
          this.defaultChar = data.readShort();
          this.breakChar = data.readShort();
          return this.maxContext = data.readShort();
        }
      }
    };

    OS2Table.prototype.encode = function() {
      return this.raw();
    };

    return OS2Table;

  })(Table);

  module.exports = OS2Table;

}).call(this);

},{"../table":24}],34:[function(_dereq_,module,exports){
// Generated by CoffeeScript 1.7.1
(function() {
  var Data, PostTable, Table,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Table = _dereq_('../table');

  Data = _dereq_('../../data');

  PostTable = (function(_super) {
    var POSTSCRIPT_GLYPHS;

    __extends(PostTable, _super);

    function PostTable() {
      return PostTable.__super__.constructor.apply(this, arguments);
    }

    PostTable.prototype.parse = function(data) {
      var i, length, numberOfGlyphs, _i, _results;
      data.pos = this.offset;
      this.format = data.readInt();
      this.italicAngle = data.readInt();
      this.underlinePosition = data.readShort();
      this.underlineThickness = data.readShort();
      this.isFixedPitch = data.readInt();
      this.minMemType42 = data.readInt();
      this.maxMemType42 = data.readInt();
      this.minMemType1 = data.readInt();
      this.maxMemType1 = data.readInt();
      switch (this.format) {
        case 0x00010000:
          break;
        case 0x00020000:
          numberOfGlyphs = data.readUInt16();
          this.glyphNameIndex = [];
          for (i = _i = 0; 0 <= numberOfGlyphs ? _i < numberOfGlyphs : _i > numberOfGlyphs; i = 0 <= numberOfGlyphs ? ++_i : --_i) {
            this.glyphNameIndex.push(data.readUInt16());
          }
          this.names = [];
          _results = [];
          while (data.pos < this.offset + this.length) {
            length = data.readByte();
            _results.push(this.names.push(data.readString(length)));
          }
          return _results;
          break;
        case 0x00025000:
          numberOfGlyphs = data.readUInt16();
          return this.offsets = data.read(numberOfGlyphs);
        case 0x00030000:
          break;
        case 0x00040000:
          return this.map = (function() {
            var _j, _ref, _results1;
            _results1 = [];
            for (i = _j = 0, _ref = this.file.maxp.numGlyphs; 0 <= _ref ? _j < _ref : _j > _ref; i = 0 <= _ref ? ++_j : --_j) {
              _results1.push(data.readUInt32());
            }
            return _results1;
          }).call(this);
      }
    };

    PostTable.prototype.glyphFor = function(code) {
      var index;
      switch (this.format) {
        case 0x00010000:
          return POSTSCRIPT_GLYPHS[code] || '.notdef';
        case 0x00020000:
          index = this.glyphNameIndex[code];
          if (index <= 257) {
            return POSTSCRIPT_GLYPHS[index];
          } else {
            return this.names[index - 258] || '.notdef';
          }
          break;
        case 0x00025000:
          return POSTSCRIPT_GLYPHS[code + this.offsets[code]] || '.notdef';
        case 0x00030000:
          return '.notdef';
        case 0x00040000:
          return this.map[code] || 0xFFFF;
      }
    };

    PostTable.prototype.encode = function(mapping) {
      var id, index, indexes, position, post, raw, string, strings, table, _i, _j, _k, _len, _len1, _len2;
      if (!this.exists) {
        return null;
      }
      raw = this.raw();
      if (this.format === 0x00030000) {
        return raw;
      }
      table = new Data(raw.slice(0, 32));
      table.writeUInt32(0x00020000);
      table.pos = 32;
      indexes = [];
      strings = [];
      for (_i = 0, _len = mapping.length; _i < _len; _i++) {
        id = mapping[_i];
        post = this.glyphFor(id);
        position = POSTSCRIPT_GLYPHS.indexOf(post);
        if (position !== -1) {
          indexes.push(position);
        } else {
          indexes.push(257 + strings.length);
          strings.push(post);
        }
      }
      table.writeUInt16(Object.keys(mapping).length);
      for (_j = 0, _len1 = indexes.length; _j < _len1; _j++) {
        index = indexes[_j];
        table.writeUInt16(index);
      }
      for (_k = 0, _len2 = strings.length; _k < _len2; _k++) {
        string = strings[_k];
        table.writeByte(string.length);
        table.writeString(string);
      }
      return table.data;
    };

    POSTSCRIPT_GLYPHS = '.notdef .null nonmarkingreturn space exclam quotedbl numbersign dollar percent\nampersand quotesingle parenleft parenright asterisk plus comma hyphen period slash\nzero one two three four five six seven eight nine colon semicolon less equal greater\nquestion at A B C D E F G H I J K L M N O P Q R S T U V W X Y Z\nbracketleft backslash bracketright asciicircum underscore grave\na b c d e f g h i j k l m n o p q r s t u v w x y z\nbraceleft bar braceright asciitilde Adieresis Aring Ccedilla Eacute Ntilde Odieresis\nUdieresis aacute agrave acircumflex adieresis atilde aring ccedilla eacute egrave\necircumflex edieresis iacute igrave icircumflex idieresis ntilde oacute ograve\nocircumflex odieresis otilde uacute ugrave ucircumflex udieresis dagger degree cent\nsterling section bullet paragraph germandbls registered copyright trademark acute\ndieresis notequal AE Oslash infinity plusminus lessequal greaterequal yen mu\npartialdiff summation product pi integral ordfeminine ordmasculine Omega ae oslash\nquestiondown exclamdown logicalnot radical florin approxequal Delta guillemotleft\nguillemotright ellipsis nonbreakingspace Agrave Atilde Otilde OE oe endash emdash\nquotedblleft quotedblright quoteleft quoteright divide lozenge ydieresis Ydieresis\nfraction currency guilsinglleft guilsinglright fi fl daggerdbl periodcentered\nquotesinglbase quotedblbase perthousand Acircumflex Ecircumflex Aacute Edieresis\nEgrave Iacute Icircumflex Idieresis Igrave Oacute Ocircumflex apple Ograve Uacute\nUcircumflex Ugrave dotlessi circumflex tilde macron breve dotaccent ring cedilla\nhungarumlaut ogonek caron Lslash lslash Scaron scaron Zcaron zcaron brokenbar Eth\neth Yacute yacute Thorn thorn minus multiply onesuperior twosuperior threesuperior\nonehalf onequarter threequarters franc Gbreve gbreve Idotaccent Scedilla scedilla\nCacute cacute Ccaron ccaron dcroat'.split(/\s+/g);

    return PostTable;

  })(Table);

  module.exports = PostTable;

}).call(this);

},{"../../data":17,"../table":24}],35:[function(_dereq_,module,exports){
// Generated by CoffeeScript 1.7.1
(function() {
  var CmapTable, DFont, Data, Directory, GlyfTable, HeadTable, HheaTable, HmtxTable, LocaTable, MaxpTable, NameTable, OS2Table, PostTable, TTFFont, fs;

  fs = _dereq_('fs');

  Data = _dereq_('../data');

  DFont = _dereq_('./dfont');

  Directory = _dereq_('./directory');

  NameTable = _dereq_('./tables/name');

  HeadTable = _dereq_('./tables/head');

  CmapTable = _dereq_('./tables/cmap');

  HmtxTable = _dereq_('./tables/hmtx');

  HheaTable = _dereq_('./tables/hhea');

  MaxpTable = _dereq_('./tables/maxp');

  PostTable = _dereq_('./tables/post');

  OS2Table = _dereq_('./tables/os2');

  LocaTable = _dereq_('./tables/loca');

  GlyfTable = _dereq_('./tables/glyf');

  TTFFont = (function() {
    TTFFont.open = function(filename, name) {
      var contents;
      contents = fs.readFileSync(filename);
      return new TTFFont(contents, name);
    };

    TTFFont.fromDFont = function(filename, family) {
      var dfont;
      dfont = DFont.open(filename);
      return new TTFFont(dfont.getNamedFont(family));
    };

    function TTFFont(rawData, name) {
      var data, i, numFonts, offset, offsets, version, _i, _j, _len;
      this.rawData = rawData;
      data = this.contents = new Data(rawData);
      if (data.readString(4) === 'ttcf') {
        if (!name) {
          throw new Error("Must specify a font name for TTC files.");
        }
        version = data.readInt();
        numFonts = data.readInt();
        offsets = [];
        for (i = _i = 0; 0 <= numFonts ? _i < numFonts : _i > numFonts; i = 0 <= numFonts ? ++_i : --_i) {
          offsets[i] = data.readInt();
        }
        for (i = _j = 0, _len = offsets.length; _j < _len; i = ++_j) {
          offset = offsets[i];
          data.pos = offset;
          this.parse();
          if (this.name.postscriptName === name) {
            return;
          }
        }
        throw new Error("Font " + name + " not found in TTC file.");
      } else {
        data.pos = 0;
        this.parse();
      }
    }

    TTFFont.prototype.parse = function() {
      this.directory = new Directory(this.contents);
      this.head = new HeadTable(this);
      this.name = new NameTable(this);
      this.cmap = new CmapTable(this);
      this.hhea = new HheaTable(this);
      this.maxp = new MaxpTable(this);
      this.hmtx = new HmtxTable(this);
      this.post = new PostTable(this);
      this.os2 = new OS2Table(this);
      this.loca = new LocaTable(this);
      this.glyf = new GlyfTable(this);
      this.ascender = (this.os2.exists && this.os2.ascender) || this.hhea.ascender;
      this.decender = (this.os2.exists && this.os2.decender) || this.hhea.decender;
      this.lineGap = (this.os2.exists && this.os2.lineGap) || this.hhea.lineGap;
      return this.bbox = [this.head.xMin, this.head.yMin, this.head.xMax, this.head.yMax];
    };

    TTFFont.prototype.characterToGlyph = function(character) {
      var _ref;
      return ((_ref = this.cmap.unicode) != null ? _ref.codeMap[character] : void 0) || 0;
    };

    TTFFont.prototype.widthOfGlyph = function(glyph) {
      var scale;
      scale = 1000.0 / this.head.unitsPerEm;
      return this.hmtx.forGlyph(glyph).advance * scale;
    };

    return TTFFont;

  })();

  module.exports = TTFFont;

}).call(this);

},{"../data":17,"./dfont":21,"./directory":22,"./tables/cmap":25,"./tables/glyf":26,"./tables/head":27,"./tables/hhea":28,"./tables/hmtx":29,"./tables/loca":30,"./tables/maxp":31,"./tables/name":32,"./tables/os2":33,"./tables/post":34,"fs":"x/K9gc"}],36:[function(_dereq_,module,exports){
// Generated by CoffeeScript 1.7.1

/*
 * An implementation of Ruby's string.succ method.
 * By Devon Govett
 *
 * Returns the successor to str. The successor is calculated by incrementing characters starting 
 * from the rightmost alphanumeric (or the rightmost character if there are no alphanumerics) in the
 * string. Incrementing a digit always results in another digit, and incrementing a letter results in
 * another letter of the same case.
 *
 * If the increment generates a carry, the character to the left of it is incremented. This 
 * process repeats until there is no carry, adding an additional character if necessary.
 *
 * succ("abcd")      == "abce"
 * succ("THX1138")   == "THX1139"
 * succ("<<koala>>") == "<<koalb>>"
 * succ("1999zzz")   == "2000aaa"
 * succ("ZZZ9999")   == "AAAA0000"
 */

(function() {
  exports.successorOf = function(input) {
    var added, alphabet, carry, i, index, isUpperCase, last, length, next, result;
    alphabet = 'abcdefghijklmnopqrstuvwxyz';
    length = alphabet.length;
    result = input;
    i = input.length;
    while (i >= 0) {
      last = input.charAt(--i);
      if (isNaN(last)) {
        index = alphabet.indexOf(last.toLowerCase());
        if (index === -1) {
          next = last;
          carry = true;
        } else {
          next = alphabet.charAt((index + 1) % length);
          isUpperCase = last === last.toUpperCase();
          if (isUpperCase) {
            next = next.toUpperCase();
          }
          carry = index + 1 >= length;
          if (carry && i === 0) {
            added = isUpperCase ? 'A' : 'a';
            result = added + next + result.slice(1);
            break;
          }
        }
      } else {
        next = +last + 1;
        carry = next > 9;
        if (carry) {
          next = 0;
        }
        if (carry && i === 0) {
          result = '1' + next + result.slice(1);
          break;
        }
      }
      result = result.slice(0, i) + next + result.slice(i + 1);
      if (!carry) {
        break;
      }
    }
    return result;
  };

  exports.invert = function(object) {
    var key, ret, val;
    ret = {};
    for (key in object) {
      val = object[key];
      ret[val] = key;
    }
    return ret;
  };

}).call(this);

},{}],37:[function(_dereq_,module,exports){
// Generated by CoffeeScript 1.7.1
(function() {
  var PDFGradient, PDFLinearGradient, PDFRadialGradient,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  PDFGradient = (function() {
    function PDFGradient(doc) {
      this.doc = doc;
      this.stops = [];
      this.embedded = false;
      this.transform = [1, 0, 0, 1, 0, 0];
      this._colorSpace = 'DeviceRGB';
    }

    PDFGradient.prototype.stop = function(pos, color, opacity) {
      if (opacity == null) {
        opacity = 1;
      }
      opacity = Math.max(0, Math.min(1, opacity));
      this.stops.push([pos, this.doc._normalizeColor(color), opacity]);
      return this;
    };

    PDFGradient.prototype.embed = function() {
      var bounds, dx, dy, encode, fn, form, grad, group, gstate, i, last, m, m0, m1, m11, m12, m2, m21, m22, m3, m4, m5, name, pattern, resources, sMask, shader, stop, stops, v, _i, _j, _len, _ref, _ref1, _ref2;
      if (this.embedded || this.stops.length === 0) {
        return;
      }
      this.embedded = true;
      last = this.stops[this.stops.length - 1];
      if (last[0] < 1) {
        this.stops.push([1, last[1], last[2]]);
      }
      bounds = [];
      encode = [];
      stops = [];
      for (i = _i = 0, _ref = this.stops.length - 1; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
        encode.push(0, 1);
        if (i + 2 !== this.stops.length) {
          bounds.push(this.stops[i + 1][0]);
        }
        fn = this.doc.ref({
          FunctionType: 2,
          Domain: [0, 1],
          C0: this.stops[i + 0][1],
          C1: this.stops[i + 1][1],
          N: 1
        });
        stops.push(fn);
        fn.end();
      }
      if (stops.length === 1) {
        fn = stops[0];
      } else {
        fn = this.doc.ref({
          FunctionType: 3,
          Domain: [0, 1],
          Functions: stops,
          Bounds: bounds,
          Encode: encode
        });
        fn.end();
      }
      this.id = 'Sh' + (++this.doc._gradCount);
      m = this.doc._ctm.slice();
      m0 = m[0], m1 = m[1], m2 = m[2], m3 = m[3], m4 = m[4], m5 = m[5];
      _ref1 = this.transform, m11 = _ref1[0], m12 = _ref1[1], m21 = _ref1[2], m22 = _ref1[3], dx = _ref1[4], dy = _ref1[5];
      m[0] = m0 * m11 + m2 * m12;
      m[1] = m1 * m11 + m3 * m12;
      m[2] = m0 * m21 + m2 * m22;
      m[3] = m1 * m21 + m3 * m22;
      m[4] = m0 * dx + m2 * dy + m4;
      m[5] = m1 * dx + m3 * dy + m5;
      shader = this.shader(fn);
      shader.end();
      pattern = this.doc.ref({
        Type: 'Pattern',
        PatternType: 2,
        Shading: shader,
        Matrix: (function() {
          var _j, _len, _results;
          _results = [];
          for (_j = 0, _len = m.length; _j < _len; _j++) {
            v = m[_j];
            _results.push(+v.toFixed(5));
          }
          return _results;
        })()
      });
      this.doc.page.patterns[this.id] = pattern;
      pattern.end();
      if (this.stops.some(function(stop) {
        return stop[2] < 1;
      })) {
        grad = this.opacityGradient();
        grad._colorSpace = 'DeviceGray';
        _ref2 = this.stops;
        for (_j = 0, _len = _ref2.length; _j < _len; _j++) {
          stop = _ref2[_j];
          grad.stop(stop[0], [stop[2]]);
        }
        grad = grad.embed();
        group = this.doc.ref({
          Type: 'Group',
          S: 'Transparency',
          CS: 'DeviceGray'
        });
        group.end();
        resources = this.doc.ref({
          ProcSet: ['PDF', 'Text', 'ImageB', 'ImageC', 'ImageI'],
          Shading: {
            Sh1: grad.data.Shading
          }
        });
        resources.end();
        form = this.doc.ref({
          Type: 'XObject',
          Subtype: 'Form',
          FormType: 1,
          BBox: [0, 0, this.doc.page.width, this.doc.page.height],
          Group: group,
          Resources: resources
        });
        form.end("/Sh1 sh");
        sMask = this.doc.ref({
          Type: 'Mask',
          S: 'Luminosity',
          G: form
        });
        sMask.end();
        gstate = this.doc.ref({
          Type: 'ExtGState',
          SMask: sMask
        });
        this.opacity_id = ++this.doc._opacityCount;
        name = "Gs" + this.opacity_id;
        this.doc.page.ext_gstates[name] = gstate;
        gstate.end();
      }
      return pattern;
    };

    PDFGradient.prototype.apply = function(op) {
      if (!this.embedded) {
        this.embed();
      }
      this.doc.addContent("/" + this.id + " " + op);
      if (this.opacity_id) {
        this.doc.addContent("/Gs" + this.opacity_id + " gs");
        return this.doc._sMasked = true;
      }
    };

    return PDFGradient;

  })();

  PDFLinearGradient = (function(_super) {
    __extends(PDFLinearGradient, _super);

    function PDFLinearGradient(doc, x1, y1, x2, y2) {
      this.doc = doc;
      this.x1 = x1;
      this.y1 = y1;
      this.x2 = x2;
      this.y2 = y2;
      PDFLinearGradient.__super__.constructor.apply(this, arguments);
    }

    PDFLinearGradient.prototype.shader = function(fn) {
      return this.doc.ref({
        ShadingType: 2,
        ColorSpace: this._colorSpace,
        Coords: [this.x1, this.y1, this.x2, this.y2],
        Function: fn,
        Extend: [true, true]
      });
    };

    PDFLinearGradient.prototype.opacityGradient = function() {
      return new PDFLinearGradient(this.doc, this.x1, this.y1, this.x2, this.y2);
    };

    return PDFLinearGradient;

  })(PDFGradient);

  PDFRadialGradient = (function(_super) {
    __extends(PDFRadialGradient, _super);

    function PDFRadialGradient(doc, x1, y1, r1, x2, y2, r2) {
      this.doc = doc;
      this.x1 = x1;
      this.y1 = y1;
      this.r1 = r1;
      this.x2 = x2;
      this.y2 = y2;
      this.r2 = r2;
      PDFRadialGradient.__super__.constructor.apply(this, arguments);
    }

    PDFRadialGradient.prototype.shader = function(fn) {
      return this.doc.ref({
        ShadingType: 3,
        ColorSpace: this._colorSpace,
        Coords: [this.x1, this.y1, this.r1, this.x2, this.y2, this.r2],
        Function: fn,
        Extend: [true, true]
      });
    };

    PDFRadialGradient.prototype.opacityGradient = function() {
      return new PDFRadialGradient(this.doc, this.x1, this.y1, this.r1, this.x2, this.y2, this.r2);
    };

    return PDFRadialGradient;

  })(PDFGradient);

  module.exports = {
    PDFGradient: PDFGradient,
    PDFLinearGradient: PDFLinearGradient,
    PDFRadialGradient: PDFRadialGradient
  };

}).call(this);

},{}],38:[function(_dereq_,module,exports){
(function (Buffer){
// Generated by CoffeeScript 1.7.1

/*
PDFImage - embeds images in PDF documents
By Devon Govett
 */

(function() {
  var Data, JPEG, PDFImage, PNG, fs;

  fs = _dereq_('fs');

  Data = _dereq_('./data');

  JPEG = _dereq_('./image/jpeg');

  PNG = _dereq_('./image/png');

  PDFImage = (function() {
    function PDFImage() {}

    PDFImage.open = function(src, label) {
      var data;
      if (Buffer.isBuffer(src)) {
        data = src;
      } else {
        data = fs.readFileSync(src);
        if (!data) {
          return;
        }
      }
      if (data[0] === 0xff && data[1] === 0xd8) {
        return new JPEG(data, label);
      } else if (data[0] === 0x89 && data.toString('ascii', 1, 4) === 'PNG') {
        return new PNG(data, label);
      } else {
        throw new Error('Unknown image format.');
      }
    };

    return PDFImage;

  })();

  module.exports = PDFImage;

}).call(this);

}).call(this,_dereq_("buffer").Buffer)
},{"./data":17,"./image/jpeg":39,"./image/png":40,"buffer":1,"fs":"x/K9gc"}],39:[function(_dereq_,module,exports){
// Generated by CoffeeScript 1.7.1
(function() {
  var JPEG, fs,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  fs = _dereq_('fs');

  JPEG = (function() {
    var MARKERS;

    MARKERS = [0xFFC0, 0xFFC1, 0xFFC2, 0xFFC3, 0xFFC5, 0xFFC6, 0xFFC7, 0xFFC8, 0xFFC9, 0xFFCA, 0xFFCB, 0xFFCC, 0xFFCD, 0xFFCE, 0xFFCF];

    function JPEG(data, label) {
      var channels, marker, pos;
      this.data = data;
      this.label = label;
      if (data.readUInt16BE(0) !== 0xFFD8) {
        throw "SOI not found in JPEG";
      }
      pos = 2;
      while (pos < data.length) {
        marker = data.readUInt16BE(pos);
        pos += 2;
        if (__indexOf.call(MARKERS, marker) >= 0) {
          break;
        }
        pos += data.readUInt16BE(pos);
      }
      if (__indexOf.call(MARKERS, marker) < 0) {
        throw "Invalid JPEG.";
      }
      pos += 2;
      this.bits = data[pos++];
      this.height = data.readUInt16BE(pos);
      pos += 2;
      this.width = data.readUInt16BE(pos);
      pos += 2;
      channels = data[pos++];
      this.colorSpace = (function() {
        switch (channels) {
          case 1:
            return 'DeviceGray';
          case 3:
            return 'DeviceRGB';
          case 4:
            return 'DeviceCMYK';
        }
      })();
      this.obj = null;
    }

    JPEG.prototype.embed = function(document) {
      if (this.obj) {
        return;
      }
      this.obj = document.ref({
        Type: 'XObject',
        Subtype: 'Image',
        BitsPerComponent: this.bits,
        Width: this.width,
        Height: this.height,
        Length: this.data.length,
        ColorSpace: this.colorSpace,
        Filter: 'DCTDecode'
      });
      if (this.colorSpace === 'DeviceCMYK') {
        this.obj.data['Decode'] = [1.0, 0.0, 1.0, 0.0, 1.0, 0.0, 1.0, 0.0];
      }
      this.obj.end(this.data);
      return this.data = null;
    };

    return JPEG;

  })();

  module.exports = JPEG;

}).call(this);

},{"fs":"x/K9gc"}],40:[function(_dereq_,module,exports){
(function (Buffer){
// Generated by CoffeeScript 1.7.1
(function() {
  var PNG, PNGImage, zlib;

  zlib = _dereq_('zlib');

  PNG = _dereq_('png-js');

  PNGImage = (function() {
    function PNGImage(data, label) {
      this.label = label;
      this.image = new PNG(data);
      this.width = this.image.width;
      this.height = this.image.height;
      this.imgData = this.image.imgData;
      this.obj = null;
    }

    PNGImage.prototype.embed = function(document) {
      var mask, palette, params, rgb, val, x, _i, _len;
      this.document = document;
      if (this.obj) {
        return;
      }
      this.obj = document.ref({
        Type: 'XObject',
        Subtype: 'Image',
        BitsPerComponent: this.image.bits,
        Width: this.width,
        Height: this.height,
        Length: this.imgData.length,
        Filter: 'FlateDecode'
      });
      if (!this.image.hasAlphaChannel) {
        params = document.ref({
          Predictor: 15,
          Colors: this.image.colors,
          BitsPerComponent: this.image.bits,
          Columns: this.width
        });
        this.obj.data['DecodeParms'] = params;
        params.end();
      }
      if (this.image.palette.length === 0) {
        this.obj.data['ColorSpace'] = this.image.colorSpace;
      } else {
        palette = document.ref({
          Length: this.image.palette.length
        });
        palette.end(this.image.palette);
        this.obj.data['ColorSpace'] = ['Indexed', 'DeviceRGB', (this.image.palette.length / 3) - 1, palette];
      }
      if (this.image.transparency.grayscale) {
        val = this.image.transparency.greyscale;
        return this.obj.data['Mask'] = [val, val];
      } else if (this.image.transparency.rgb) {
        rgb = this.image.transparency.rgb;
        mask = [];
        for (_i = 0, _len = rgb.length; _i < _len; _i++) {
          x = rgb[_i];
          mask.push(x, x);
        }
        return this.obj.data['Mask'] = mask;
      } else if (this.image.transparency.indexed) {
        return this.loadIndexedAlphaChannel();
      } else if (this.image.hasAlphaChannel) {
        return this.splitAlphaChannel();
      } else {
        return this.finalize();
      }
    };

    PNGImage.prototype.finalize = function() {
      var sMask;
      if (this.alphaChannel) {
        sMask = this.document.ref({
          Type: 'XObject',
          Subtype: 'Image',
          Height: this.height,
          Width: this.width,
          BitsPerComponent: 8,
          Length: this.alphaChannel.length,
          Filter: 'FlateDecode',
          ColorSpace: 'DeviceGray',
          Decode: [0, 1]
        });
        sMask.end(this.alphaChannel);
        this.obj.data['SMask'] = sMask;
      }
      this.obj.end(this.imgData);
      this.image = null;
      return this.imgData = null;
    };

    PNGImage.prototype.splitAlphaChannel = function() {
      return this.image.decodePixels((function(_this) {
        return function(pixels) {
          var a, alphaChannel, colorByteSize, done, i, imgData, len, p, pixelCount;
          colorByteSize = _this.image.colors * _this.image.bits / 8;
          pixelCount = _this.width * _this.height;
          imgData = new Buffer(pixelCount * colorByteSize);
          alphaChannel = new Buffer(pixelCount);
          i = p = a = 0;
          len = pixels.length;
          while (i < len) {
            imgData[p++] = pixels[i++];
            imgData[p++] = pixels[i++];
            imgData[p++] = pixels[i++];
            alphaChannel[a++] = pixels[i++];
          }
          done = 0;
          zlib.deflate(imgData, function(err, imgData) {
            _this.imgData = imgData;
            if (err) {
              throw err;
            }
            if (++done === 2) {
              return _this.finalize();
            }
          });
          return zlib.deflate(alphaChannel, function(err, alphaChannel) {
            _this.alphaChannel = alphaChannel;
            if (err) {
              throw err;
            }
            if (++done === 2) {
              return _this.finalize();
            }
          });
        };
      })(this));
    };

    PNGImage.prototype.loadIndexedAlphaChannel = function(fn) {
      var transparency;
      transparency = this.image.transparency.indexed;
      return this.image.decodePixels((function(_this) {
        return function(pixels) {
          var alphaChannel, i, j, _i, _ref;
          alphaChannel = new Buffer(_this.width * _this.height);
          i = 0;
          for (j = _i = 0, _ref = pixels.length; _i < _ref; j = _i += 1) {
            alphaChannel[i++] = transparency[pixels[j]];
          }
          return zlib.deflate(alphaChannel, function(err, alphaChannel) {
            _this.alphaChannel = alphaChannel;
            if (err) {
              throw err;
            }
            return _this.finalize();
          });
        };
      })(this));
    };

    return PNGImage;

  })();

  module.exports = PNGImage;

}).call(this);

}).call(this,_dereq_("buffer").Buffer)
},{"buffer":1,"png-js":55,"zlib":15}],41:[function(_dereq_,module,exports){
// Generated by CoffeeScript 1.7.1
(function() {
  var EventEmitter, LineBreaker, LineWrapper,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  EventEmitter = _dereq_('events').EventEmitter;

  LineBreaker = _dereq_('linebreak');

  LineWrapper = (function(_super) {
    __extends(LineWrapper, _super);

    function LineWrapper(document, options) {
      var _ref;
      this.document = document;
      this.indent = options.indent || 0;
      this.charSpacing = options.characterSpacing || 0;
      this.wordSpacing = options.wordSpacing === 0;
      this.columns = options.columns || 1;
      this.columnGap = (_ref = options.columnGap) != null ? _ref : 18;
      this.lineWidth = (options.width - (this.columnGap * (this.columns - 1))) / this.columns;
      this.startX = this.document.x;
      this.startY = this.document.y;
      this.column = 1;
      this.ellipsis = options.ellipsis;
      this.continuedX = 0;
      if (options.height != null) {
        this.height = options.height;
        this.maxY = this.startY + options.height;
      } else {
        this.maxY = this.document.page.maxY();
      }
      this.on('firstLine', (function(_this) {
        return function(options) {
          var indent;
          indent = _this.continuedX || _this.indent;
          _this.document.x += indent;
          _this.lineWidth -= indent;
          return _this.once('line', function() {
            _this.document.x -= indent;
            _this.lineWidth += indent;
            if (!options.continued) {
              return _this.continuedX = 0;
            }
          });
        };
      })(this));
      this.on('lastLine', (function(_this) {
        return function(options) {
          var align;
          align = options.align;
          if (align === 'justify') {
            options.align = 'left';
          }
          _this.lastLine = true;
          return _this.once('line', function() {
            _this.document.y += options.paragraphGap || 0;
            options.align = align;
            return _this.lastLine = false;
          });
        };
      })(this));
    }

    LineWrapper.prototype.wordWidth = function(word) {
      return this.document.widthOfString(word, this) + this.charSpacing + this.wordSpacing;
    };

    LineWrapper.prototype.eachWord = function(text, fn) {
      var bk, breaker, fbk, l, last, lbk, shouldContinue, w, word, wordWidths;
      breaker = new LineBreaker(text);
      last = null;
      wordWidths = {};
      while (bk = breaker.nextBreak()) {
        word = text.slice((last != null ? last.position : void 0) || 0, bk.position);
        w = wordWidths[word] != null ? wordWidths[word] : wordWidths[word] = this.wordWidth(word);
        if (w > this.lineWidth) {
          lbk = last;
          fbk = {};
          while (word.length) {
            l = word.length;
            while (w > this.spaceLeft) {
              w = this.wordWidth(word.slice(0, --l));
            }
            fbk.required = l < word.length;
            shouldContinue = fn(word.slice(0, l), w, fbk, lbk);
            lbk = {
              required: false
            };
            word = word.slice(l);
            w = this.wordWidth(word);
            if (shouldContinue === false) {
              break;
            }
          }
        } else {
          shouldContinue = fn(word, w, bk, last);
        }
        if (shouldContinue === false) {
          break;
        }
        last = bk;
      }
    };

    LineWrapper.prototype.wrap = function(text, options) {
      var buffer, emitLine, lc, nextY, textWidth, wc, y;
      if (options.indent != null) {
        this.indent = options.indent;
      }
      if (options.characterSpacing != null) {
        this.charSpacing = options.characterSpacing;
      }
      if (options.wordSpacing != null) {
        this.wordSpacing = options.wordSpacing;
      }
      if (options.ellipsis != null) {
        this.ellipsis = options.ellipsis;
      }
      nextY = this.document.y + this.document.currentLineHeight(true);
      if (this.document.y > this.maxY || nextY > this.maxY) {
        this.nextSection();
      }
      buffer = '';
      textWidth = 0;
      wc = 0;
      lc = 0;
      y = this.document.y;
      emitLine = (function(_this) {
        return function() {
          options.textWidth = textWidth + _this.wordSpacing * (wc - 1);
          options.wordCount = wc;
          options.lineWidth = _this.lineWidth;
          y = _this.document.y;
          _this.emit('line', buffer, options, _this);
          return lc++;
        };
      })(this);
      this.emit('sectionStart', options, this);
      this.eachWord(text, (function(_this) {
        return function(word, w, bk, last) {
          var lh, shouldContinue;
          if ((last == null) || last.required) {
            _this.emit('firstLine', options, _this);
            _this.spaceLeft = _this.lineWidth;
          }
          if (w <= _this.spaceLeft) {
            buffer += word;
            textWidth += w;
            wc++;
          }
          if (bk.required || w > _this.spaceLeft) {
            if (bk.required) {
              _this.emit('lastLine', options, _this);
            }
            lh = _this.document.currentLineHeight(true);
            if ((_this.height != null) && _this.ellipsis && _this.document.y + lh * 2 > _this.maxY && _this.column >= _this.columns) {
              if (_this.ellipsis === true) {
                _this.ellipsis = '…';
              }
              buffer = buffer.trimRight();
              textWidth = _this.wordWidth(buffer + _this.ellipsis);
              while (textWidth > _this.lineWidth) {
                buffer = buffer.slice(0, -1).trimRight();
                textWidth = _this.wordWidth(buffer + _this.ellipsis);
              }
              buffer = buffer + _this.ellipsis;
            }
            emitLine();
            if (_this.document.y + lh > _this.maxY) {
              shouldContinue = _this.nextSection();
              if (!shouldContinue) {
                wc = 0;
                buffer = '';
                return false;
              }
            }
            if (bk.required) {
              if (w > _this.spaceLeft) {
                buffer = word;
                textWidth = w;
                wc = 1;
                emitLine();
              }
              _this.spaceLeft = _this.lineWidth;
              buffer = '';
              textWidth = 0;
              return wc = 0;
            } else {
              _this.spaceLeft = _this.lineWidth - w;
              buffer = word;
              textWidth = w;
              return wc = 1;
            }
          } else {
            return _this.spaceLeft -= w;
          }
        };
      })(this));
      if (wc > 0) {
        this.emit('lastLine', options, this);
        emitLine();
      }
      this.emit('sectionEnd', options, this);
      if (options.continued === true) {
        if (lc > 1) {
          this.continuedX = 0;
        }
        this.continuedX += options.textWidth;
        return this.document.y = y;
      } else {
        return this.document.x = this.startX;
      }
    };

    LineWrapper.prototype.nextSection = function(options) {
      var _ref;
      this.emit('sectionEnd', options, this);
      if (++this.column > this.columns) {
        if (this.height != null) {
          return false;
        }
        this.document.addPage();
        this.column = 1;
        this.startY = this.document.page.margins.top;
        this.maxY = this.document.page.maxY();
        this.document.x = this.startX;
        if (this.document._fillColor) {
          (_ref = this.document).fillColor.apply(_ref, this.document._fillColor);
        }
        this.emit('pageBreak', options, this);
      } else {
        this.document.x += this.lineWidth + this.columnGap;
        this.document.y = this.startY;
        this.emit('columnBreak', options, this);
      }
      this.emit('sectionStart', options, this);
      return true;
    };

    return LineWrapper;

  })(EventEmitter);

  module.exports = LineWrapper;

}).call(this);

},{"events":4,"linebreak":53}],42:[function(_dereq_,module,exports){
// Generated by CoffeeScript 1.7.1
(function() {
  var PDFObject;

  PDFObject = _dereq_('../object');

  module.exports = {
    annotate: function(x, y, w, h, options) {
      var key, ref, val;
      options.Type = 'Annot';
      options.Rect = this._convertRect(x, y, w, h);
      options.Border = [0, 0, 0];
      if (options.Subtype !== 'Link') {
        if (options.C == null) {
          options.C = this._normalizeColor(options.color || [0, 0, 0]);
        }
      }
      delete options.color;
      if (typeof options.Dest === 'string') {
        options.Dest = PDFObject.s(options.Dest);
      }
      for (key in options) {
        val = options[key];
        options[key[0].toUpperCase() + key.slice(1)] = val;
      }
      ref = this.ref(options);
      this.page.annotations.push(ref);
      ref.end();
      return this;
    },
    note: function(x, y, w, h, contents, options) {
      if (options == null) {
        options = {};
      }
      options.Subtype = 'Text';
      options.Contents = PDFObject.s(contents);
      options.Name = 'Comment';
      if (options.color == null) {
        options.color = [243, 223, 92];
      }
      return this.annotate(x, y, w, h, options);
    },
    link: function(x, y, w, h, url, options) {
      if (options == null) {
        options = {};
      }
      options.Subtype = 'Link';
      options.A = this.ref({
        S: 'URI',
        URI: PDFObject.s(url)
      });
      options.A.end();
      return this.annotate(x, y, w, h, options);
    },
    _markup: function(x, y, w, h, options) {
      var x1, x2, y1, y2, _ref;
      if (options == null) {
        options = {};
      }
      _ref = this._convertRect(x, y, w, h), x1 = _ref[0], y1 = _ref[1], x2 = _ref[2], y2 = _ref[3];
      options.QuadPoints = [x1, y2, x2, y2, x1, y1, x2, y1];
      options.Contents = PDFObject.s('');
      return this.annotate(x, y, w, h, options);
    },
    highlight: function(x, y, w, h, options) {
      if (options == null) {
        options = {};
      }
      options.Subtype = 'Highlight';
      if (options.color == null) {
        options.color = [241, 238, 148];
      }
      return this._markup(x, y, w, h, options);
    },
    underline: function(x, y, w, h, options) {
      if (options == null) {
        options = {};
      }
      options.Subtype = 'Underline';
      return this._markup(x, y, w, h, options);
    },
    strike: function(x, y, w, h, options) {
      if (options == null) {
        options = {};
      }
      options.Subtype = 'StrikeOut';
      return this._markup(x, y, w, h, options);
    },
    lineAnnotation: function(x1, y1, x2, y2, options) {
      if (options == null) {
        options = {};
      }
      options.Subtype = 'Line';
      options.Contents = PDFObject.s('');
      options.L = [x1, this.page.height - y1, x2, this.page.height - y2];
      return this.annotate(x1, y1, x2, y2, options);
    },
    rectAnnotation: function(x, y, w, h, options) {
      if (options == null) {
        options = {};
      }
      options.Subtype = 'Square';
      options.Contents = PDFObject.s('');
      return this.annotate(x, y, w, h, options);
    },
    ellipseAnnotation: function(x, y, w, h, options) {
      if (options == null) {
        options = {};
      }
      options.Subtype = 'Circle';
      options.Contents = PDFObject.s('');
      return this.annotate(x, y, w, h, options);
    },
    textAnnotation: function(x, y, w, h, text, options) {
      if (options == null) {
        options = {};
      }
      options.Subtype = 'FreeText';
      options.Contents = PDFObject.s(text);
      options.DA = PDFObject.s('');
      return this.annotate(x, y, w, h, options);
    },
    _convertRect: function(x1, y1, w, h) {
      var m0, m1, m2, m3, m4, m5, x2, y2, _ref;
      y2 = y1;
      y1 += h;
      x2 = x1 + w;
      _ref = this._ctm, m0 = _ref[0], m1 = _ref[1], m2 = _ref[2], m3 = _ref[3], m4 = _ref[4], m5 = _ref[5];
      x1 = m0 * x1 + m2 * y1 + m4;
      y1 = m1 * x1 + m3 * y1 + m5;
      x2 = m0 * x2 + m2 * y2 + m4;
      y2 = m1 * x2 + m3 * y2 + m5;
      return [x1, y1, x2, y2];
    }
  };

}).call(this);

},{"../object":48}],43:[function(_dereq_,module,exports){
// Generated by CoffeeScript 1.7.1
(function() {
  var PDFGradient, PDFLinearGradient, PDFRadialGradient, namedColors, _ref;

  _ref = _dereq_('../gradient'), PDFGradient = _ref.PDFGradient, PDFLinearGradient = _ref.PDFLinearGradient, PDFRadialGradient = _ref.PDFRadialGradient;

  module.exports = {
    initColor: function() {
      this._opacityRegistry = {};
      this._opacityCount = 0;
      return this._gradCount = 0;
    },
    _normalizeColor: function(color) {
      var hex, part;
      if (color instanceof PDFGradient) {
        return color;
      }
      if (typeof color === 'string') {
        if (color.charAt(0) === '#') {
          if (color.length === 4) {
            color = color.replace(/#([0-9A-F])([0-9A-F])([0-9A-F])/i, "#$1$1$2$2$3$3");
          }
          hex = parseInt(color.slice(1), 16);
          color = [hex >> 16, hex >> 8 & 0xff, hex & 0xff];
        } else if (namedColors[color]) {
          color = namedColors[color];
        }
      }
      if (Array.isArray(color)) {
        if (color.length === 3) {
          color = (function() {
            var _i, _len, _results;
            _results = [];
            for (_i = 0, _len = color.length; _i < _len; _i++) {
              part = color[_i];
              _results.push(part / 255);
            }
            return _results;
          })();
        } else if (color.length === 4) {
          color = (function() {
            var _i, _len, _results;
            _results = [];
            for (_i = 0, _len = color.length; _i < _len; _i++) {
              part = color[_i];
              _results.push(part / 100);
            }
            return _results;
          })();
        }
        return color;
      }
      return null;
    },
    _setColor: function(color, stroke) {
      var gstate, name, op, space;
      color = this._normalizeColor(color);
      if (!color) {
        return false;
      }
      if (this._sMasked) {
        gstate = this.ref({
          Type: 'ExtGState',
          SMask: 'None'
        });
        gstate.end();
        name = "Gs" + (++this._opacityCount);
        this.page.ext_gstates[name] = gstate;
        this.addContent("/" + name + " gs");
        this._sMasked = false;
      }
      op = stroke ? 'SCN' : 'scn';
      if (color instanceof PDFGradient) {
        this._setColorSpace('Pattern', stroke);
        color.apply(op);
      } else {
        space = color.length === 4 ? 'DeviceCMYK' : 'DeviceRGB';
        this._setColorSpace(space, stroke);
        color = color.join(' ');
        this.addContent("" + color + " " + op);
      }
      return true;
    },
    _setColorSpace: function(space, stroke) {
      var op;
      op = stroke ? 'CS' : 'cs';
      return this.addContent("/" + space + " " + op);
    },
    fillColor: function(color, opacity) {
      var set;
      if (opacity == null) {
        opacity = 1;
      }
      set = this._setColor(color, false);
      if (set) {
        this.fillOpacity(opacity);
      }
      this._fillColor = [color, opacity];
      return this;
    },
    strokeColor: function(color, opacity) {
      var set;
      if (opacity == null) {
        opacity = 1;
      }
      set = this._setColor(color, true);
      if (set) {
        this.strokeOpacity(opacity);
      }
      return this;
    },
    opacity: function(opacity) {
      this._doOpacity(opacity, opacity);
      return this;
    },
    fillOpacity: function(opacity) {
      this._doOpacity(opacity, null);
      return this;
    },
    strokeOpacity: function(opacity) {
      this._doOpacity(null, opacity);
      return this;
    },
    _doOpacity: function(fillOpacity, strokeOpacity) {
      var dictionary, id, key, name, _ref1;
      if (!((fillOpacity != null) || (strokeOpacity != null))) {
        return;
      }
      if (fillOpacity != null) {
        fillOpacity = Math.max(0, Math.min(1, fillOpacity));
      }
      if (strokeOpacity != null) {
        strokeOpacity = Math.max(0, Math.min(1, strokeOpacity));
      }
      key = "" + fillOpacity + "_" + strokeOpacity;
      if (this._opacityRegistry[key]) {
        _ref1 = this._opacityRegistry[key], dictionary = _ref1[0], name = _ref1[1];
      } else {
        dictionary = {
          Type: 'ExtGState'
        };
        if (fillOpacity != null) {
          dictionary.ca = fillOpacity;
        }
        if (strokeOpacity != null) {
          dictionary.CA = strokeOpacity;
        }
        dictionary = this.ref(dictionary);
        dictionary.end();
        id = ++this._opacityCount;
        name = "Gs" + id;
        this._opacityRegistry[key] = [dictionary, name];
      }
      this.page.ext_gstates[name] = dictionary;
      return this.addContent("/" + name + " gs");
    },
    linearGradient: function(x1, y1, x2, y2) {
      return new PDFLinearGradient(this, x1, y1, x2, y2);
    },
    radialGradient: function(x1, y1, r1, x2, y2, r2) {
      return new PDFRadialGradient(this, x1, y1, r1, x2, y2, r2);
    }
  };

  namedColors = {
    aliceblue: [240, 248, 255],
    antiquewhite: [250, 235, 215],
    aqua: [0, 255, 255],
    aquamarine: [127, 255, 212],
    azure: [240, 255, 255],
    beige: [245, 245, 220],
    bisque: [255, 228, 196],
    black: [0, 0, 0],
    blanchedalmond: [255, 235, 205],
    blue: [0, 0, 255],
    blueviolet: [138, 43, 226],
    brown: [165, 42, 42],
    burlywood: [222, 184, 135],
    cadetblue: [95, 158, 160],
    chartreuse: [127, 255, 0],
    chocolate: [210, 105, 30],
    coral: [255, 127, 80],
    cornflowerblue: [100, 149, 237],
    cornsilk: [255, 248, 220],
    crimson: [220, 20, 60],
    cyan: [0, 255, 255],
    darkblue: [0, 0, 139],
    darkcyan: [0, 139, 139],
    darkgoldenrod: [184, 134, 11],
    darkgray: [169, 169, 169],
    darkgreen: [0, 100, 0],
    darkgrey: [169, 169, 169],
    darkkhaki: [189, 183, 107],
    darkmagenta: [139, 0, 139],
    darkolivegreen: [85, 107, 47],
    darkorange: [255, 140, 0],
    darkorchid: [153, 50, 204],
    darkred: [139, 0, 0],
    darksalmon: [233, 150, 122],
    darkseagreen: [143, 188, 143],
    darkslateblue: [72, 61, 139],
    darkslategray: [47, 79, 79],
    darkslategrey: [47, 79, 79],
    darkturquoise: [0, 206, 209],
    darkviolet: [148, 0, 211],
    deeppink: [255, 20, 147],
    deepskyblue: [0, 191, 255],
    dimgray: [105, 105, 105],
    dimgrey: [105, 105, 105],
    dodgerblue: [30, 144, 255],
    firebrick: [178, 34, 34],
    floralwhite: [255, 250, 240],
    forestgreen: [34, 139, 34],
    fuchsia: [255, 0, 255],
    gainsboro: [220, 220, 220],
    ghostwhite: [248, 248, 255],
    gold: [255, 215, 0],
    goldenrod: [218, 165, 32],
    gray: [128, 128, 128],
    grey: [128, 128, 128],
    green: [0, 128, 0],
    greenyellow: [173, 255, 47],
    honeydew: [240, 255, 240],
    hotpink: [255, 105, 180],
    indianred: [205, 92, 92],
    indigo: [75, 0, 130],
    ivory: [255, 255, 240],
    khaki: [240, 230, 140],
    lavender: [230, 230, 250],
    lavenderblush: [255, 240, 245],
    lawngreen: [124, 252, 0],
    lemonchiffon: [255, 250, 205],
    lightblue: [173, 216, 230],
    lightcoral: [240, 128, 128],
    lightcyan: [224, 255, 255],
    lightgoldenrodyellow: [250, 250, 210],
    lightgray: [211, 211, 211],
    lightgreen: [144, 238, 144],
    lightgrey: [211, 211, 211],
    lightpink: [255, 182, 193],
    lightsalmon: [255, 160, 122],
    lightseagreen: [32, 178, 170],
    lightskyblue: [135, 206, 250],
    lightslategray: [119, 136, 153],
    lightslategrey: [119, 136, 153],
    lightsteelblue: [176, 196, 222],
    lightyellow: [255, 255, 224],
    lime: [0, 255, 0],
    limegreen: [50, 205, 50],
    linen: [250, 240, 230],
    magenta: [255, 0, 255],
    maroon: [128, 0, 0],
    mediumaquamarine: [102, 205, 170],
    mediumblue: [0, 0, 205],
    mediumorchid: [186, 85, 211],
    mediumpurple: [147, 112, 219],
    mediumseagreen: [60, 179, 113],
    mediumslateblue: [123, 104, 238],
    mediumspringgreen: [0, 250, 154],
    mediumturquoise: [72, 209, 204],
    mediumvioletred: [199, 21, 133],
    midnightblue: [25, 25, 112],
    mintcream: [245, 255, 250],
    mistyrose: [255, 228, 225],
    moccasin: [255, 228, 181],
    navajowhite: [255, 222, 173],
    navy: [0, 0, 128],
    oldlace: [253, 245, 230],
    olive: [128, 128, 0],
    olivedrab: [107, 142, 35],
    orange: [255, 165, 0],
    orangered: [255, 69, 0],
    orchid: [218, 112, 214],
    palegoldenrod: [238, 232, 170],
    palegreen: [152, 251, 152],
    paleturquoise: [175, 238, 238],
    palevioletred: [219, 112, 147],
    papayawhip: [255, 239, 213],
    peachpuff: [255, 218, 185],
    peru: [205, 133, 63],
    pink: [255, 192, 203],
    plum: [221, 160, 221],
    powderblue: [176, 224, 230],
    purple: [128, 0, 128],
    red: [255, 0, 0],
    rosybrown: [188, 143, 143],
    royalblue: [65, 105, 225],
    saddlebrown: [139, 69, 19],
    salmon: [250, 128, 114],
    sandybrown: [244, 164, 96],
    seagreen: [46, 139, 87],
    seashell: [255, 245, 238],
    sienna: [160, 82, 45],
    silver: [192, 192, 192],
    skyblue: [135, 206, 235],
    slateblue: [106, 90, 205],
    slategray: [112, 128, 144],
    slategrey: [112, 128, 144],
    snow: [255, 250, 250],
    springgreen: [0, 255, 127],
    steelblue: [70, 130, 180],
    tan: [210, 180, 140],
    teal: [0, 128, 128],
    thistle: [216, 191, 216],
    tomato: [255, 99, 71],
    turquoise: [64, 224, 208],
    violet: [238, 130, 238],
    wheat: [245, 222, 179],
    white: [255, 255, 255],
    whitesmoke: [245, 245, 245],
    yellow: [255, 255, 0],
    yellowgreen: [154, 205, 50]
  };

}).call(this);

},{"../gradient":37}],44:[function(_dereq_,module,exports){
// Generated by CoffeeScript 1.7.1
(function() {
  var PDFFont;

  PDFFont = _dereq_('../font');

  module.exports = {
    initFonts: function() {
      this._fontFamilies = {};
      this._fontCount = 0;
      this._fontSize = 12;
      this._font = null;
      this._registeredFonts = {};
      
    },
    font: function(filename, family, size) {
      var id, _ref;
      if (typeof family === 'number') {
        size = family;
        family = null;
      }
      if (this._registeredFonts[filename]) {
        _ref = this._registeredFonts[filename], filename = _ref.filename, family = _ref.family;
      }
      if (size != null) {
        this.fontSize(size);
      }
      if (family == null) {
        family = filename;
      }
      if (this._fontFamilies[family]) {
        this._font = this._fontFamilies[family];
        return this;
      }
      id = 'F' + (++this._fontCount);
      this._font = new PDFFont(this, filename, family, id);
      this._fontFamilies[family] = this._font;
      return this;
    },
    fontSize: function(_fontSize) {
      this._fontSize = _fontSize;
      return this;
    },
    currentLineHeight: function(includeGap) {
      if (includeGap == null) {
        includeGap = false;
      }
      return this._font.lineHeight(this._fontSize, includeGap);
    },
    registerFont: function(name, path, family) {
      this._registeredFonts[name] = {
        filename: path,
        family: family
      };
      return this;
    }
  };

}).call(this);

},{"../font":19}],45:[function(_dereq_,module,exports){
(function (Buffer){
// Generated by CoffeeScript 1.7.1
(function() {
  var PDFImage;

  PDFImage = _dereq_('../image');

  module.exports = {
    initImages: function() {
      this._imageRegistry = {};
      return this._imageCount = 0;
    },
    image: function(src, x, y, options) {
      var bh, bp, bw, h, hp, image, ip, w, wp, _base, _name, _ref, _ref1, _ref2;
      if (options == null) {
        options = {};
      }
      if (typeof x === 'object') {
        options = x;
        x = null;
      }
      x = (_ref = x != null ? x : options.x) != null ? _ref : this.x;
      y = (_ref1 = y != null ? y : options.y) != null ? _ref1 : this.y;
      image = this._imageRegistry[src];
      if (!image) {
        image = PDFImage.open(src, 'I' + (++this._imageCount));
        image.embed(this);
        if (!Buffer.isBuffer(src)) {
          this._imageRegistry[src] = image;
        }
      }
      if ((_base = this.page.xobjects)[_name = image.label] == null) {
        _base[_name] = image.obj;
      }
      w = options.width || image.width;
      h = options.height || image.height;
      if (options.width && !options.height) {
        wp = w / image.width;
        w = image.width * wp;
        h = image.height * wp;
      } else if (options.height && !options.width) {
        hp = h / image.height;
        w = image.width * hp;
        h = image.height * hp;
      } else if (options.scale) {
        w = image.width * options.scale;
        h = image.height * options.scale;
      } else if (options.fit) {
        _ref2 = options.fit, bw = _ref2[0], bh = _ref2[1];
        bp = bw / bh;
        ip = image.width / image.height;
        if (ip > bp) {
          w = bw;
          h = bw / ip;
        } else {
          h = bh;
          w = bh * ip;
        }
        if (options.align === 'center') {
          x = x + bw / 2 - w / 2;
        } else if (options.align === 'right') {
          x = x + bw - w;
        }
      }
      if (this.y === y) {
        this.y += h;
      }
      this.save();
      this.transform(w, 0, 0, -h, x, y + h);
      this.addContent("/" + image.label + " Do");
      this.restore();
      return this;
    }
  };

}).call(this);

}).call(this,_dereq_("buffer").Buffer)
},{"../image":38,"buffer":1}],46:[function(_dereq_,module,exports){
// Generated by CoffeeScript 1.7.1
(function() {
  var LineWrapper;

  LineWrapper = _dereq_('../line_wrapper');

  module.exports = {
    initText: function() {
      this.x = 0;
      this.y = 0;
      this._lineGap = 0;
      return this._textState = {
        mode: 0,
        wordSpacing: 0,
        characterSpacing: 0
      };
    },
    lineGap: function(_lineGap) {
      this._lineGap = _lineGap;
      return this;
    },
    moveDown: function(lines) {
      if (lines == null) {
        lines = 1;
      }
      this.y += this.currentLineHeight(true) * lines + this._lineGap;
      return this;
    },
    moveUp: function(lines) {
      if (lines == null) {
        lines = 1;
      }
      this.y -= this.currentLineHeight(true) * lines + this._lineGap;
      return this;
    },
    _text: function(text, x, y, options, lineCallback) {
      var line, wrapper, _i, _len, _ref;
      options = this._initOptions(x, y, options);
      text = '' + text;
      if (options.wordSpacing) {
        text = text.replace(/\s{2,}/g, ' ');
      }
      if (options.width) {
        wrapper = this._wrapper;
        if (!wrapper) {
          wrapper = new LineWrapper(this, options);
          wrapper.on('line', lineCallback);
        }
        this._wrapper = options.continued ? wrapper : null;
        this._textOptions = options.continued ? options : null;
        wrapper.wrap(text, options);
      } else {
        _ref = text.split('\n');
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          line = _ref[_i];
          lineCallback(line, options);
        }
      }
      return this;
    },
    text: function(text, x, y, options) {
      return this._text(text, x, y, options, this._line.bind(this));
    },
    widthOfString: function(string, options) {
      if (options == null) {
        options = {};
      }
      return this._font.widthOfString(string, this._fontSize) + (options.characterSpacing || 0) * (string.length - 1);
    },
    heightOfString: function(text, options) {
      var height, lineGap, x, y;
      if (options == null) {
        options = {};
      }
      x = this.x, y = this.y;
      options = this._initOptions(options);
      options.height = Infinity;
      lineGap = options.lineGap || this._lineGap || 0;
      this._text(text, this.x, this.y, options, (function(_this) {
        return function(line, options) {
          return _this.y += _this.currentLineHeight(true) + lineGap;
        };
      })(this));
      height = this.y - y;
      this.x = x;
      this.y = y;
      return height;
    },
    list: function(list, x, y, options, wrapper) {
      var flatten, i, indent, itemIndent, items, level, levels, r;
      options = this._initOptions(x, y, options);
      r = Math.round((this._font.ascender / 1000 * this._fontSize) / 3);
      indent = options.textIndent || r * 5;
      itemIndent = options.bulletIndent || r * 8;
      level = 1;
      items = [];
      levels = [];
      flatten = function(list) {
        var i, item, _i, _len, _results;
        _results = [];
        for (i = _i = 0, _len = list.length; _i < _len; i = ++_i) {
          item = list[i];
          if (Array.isArray(item)) {
            level++;
            flatten(item);
            _results.push(level--);
          } else {
            items.push(item);
            _results.push(levels.push(level));
          }
        }
        return _results;
      };
      flatten(list);
      wrapper = new LineWrapper(this, options);
      wrapper.on('line', this._line.bind(this));
      level = 1;
      i = 0;
      wrapper.on('firstLine', (function(_this) {
        return function() {
          var diff, l;
          if ((l = levels[i++]) !== level) {
            diff = itemIndent * (l - level);
            _this.x += diff;
            wrapper.lineWidth -= diff;
            level = l;
          }
          _this.circle(_this.x - indent + r, _this.y + r + (r / 2), r);
          return _this.fill();
        };
      })(this));
      wrapper.on('sectionStart', (function(_this) {
        return function() {
          var pos;
          pos = indent + itemIndent * (level - 1);
          _this.x += pos;
          return wrapper.lineWidth -= pos;
        };
      })(this));
      wrapper.on('sectionEnd', (function(_this) {
        return function() {
          var pos;
          pos = indent + itemIndent * (level - 1);
          _this.x -= pos;
          return wrapper.lineWidth += pos;
        };
      })(this));
      wrapper.wrap(items.join('\n'), options);
      this.x -= indent;
      return this;
    },
    _initOptions: function(x, y, options) {
      var key, margins, val, _ref;
      if (x == null) {
        x = {};
      }
      if (options == null) {
        options = {};
      }
      if (typeof x === 'object') {
        options = x;
        x = null;
      }
      options = (function() {
        var k, opts, v;
        opts = {};
        for (k in options) {
          v = options[k];
          opts[k] = v;
        }
        return opts;
      })();
      if (this._textOptions) {
        _ref = this._textOptions;
        for (key in _ref) {
          val = _ref[key];
          if (key !== 'continued') {
            if (options[key] == null) {
              options[key] = val;
            }
          }
        }
      }
      if (x != null) {
        this.x = x;
      }
      if (y != null) {
        this.y = y;
      }
      if (options.lineBreak !== false) {
        margins = this.page.margins;
        if (options.width == null) {
          options.width = this.page.width - this.x - margins.right;
        }
      }
      options.columns || (options.columns = 0);
      if (options.columnGap == null) {
        options.columnGap = 18;
      }
      return options;
    },
    _line: function(text, options, wrapper) {
      var lineGap;
      if (options == null) {
        options = {};
      }
      this._fragment(text, this.x, this.y, options);
      lineGap = options.lineGap || this._lineGap || 0;
      if (!wrapper) {
        return this.x += this.widthOfString(text);
      } else {
        return this.y += this.currentLineHeight(true) + lineGap;
      }
    },
    _fragment: function(text, x, y, options) {
      var align, characterSpacing, commands, d, encoded, i, lineWidth, lineY, mode, renderedWidth, spaceWidth, state, textWidth, word, wordSpacing, words, _base, _i, _len, _name;
      text = '' + text;
      if (text.length === 0) {
        return;
      }
      state = this._textState;
      align = options.align || 'left';
      wordSpacing = options.wordSpacing || 0;
      characterSpacing = options.characterSpacing || 0;
      if (options.width) {
        switch (align) {
          case 'right':
            textWidth = this.widthOfString(text.trimRight(), options);
            x += options.lineWidth - textWidth;
            break;
          case 'center':
            x += options.lineWidth / 2 - options.textWidth / 2;
            break;
          case 'justify':
            words = text.trim().split(/\s+/);
            textWidth = this.widthOfString(text.replace(/\s+/g, ''), options);
            spaceWidth = this.widthOfString(' ') + characterSpacing;
            wordSpacing = Math.max(0, (options.lineWidth - textWidth) / Math.max(1, words.length - 1) - spaceWidth);
        }
      }
      renderedWidth = options.textWidth + (wordSpacing * (options.wordCount - 1)) + (characterSpacing * (text.length - 1));
      if (options.link) {
        this.link(x, y, renderedWidth, this.currentLineHeight(), options.link);
      }
      if (options.underline || options.strike) {
        this.save();
        if (!options.stroke) {
          this.strokeColor.apply(this, this._fillColor);
        }
        lineWidth = this._fontSize >= 20 ? 2 : 1;
        this.lineWidth(lineWidth);
        d = options.underline ? 1 : 2;
        lineY = y + this.currentLineHeight() / d;
        if (options.underline) {
          lineY -= lineWidth;
        }
        this.moveTo(x, lineY);
        this.lineTo(x + renderedWidth, lineY);
        this.stroke();
        this.restore();
      }
      this.save();
      this.transform(1, 0, 0, -1, 0, this.page.height);
      y = this.page.height - y - (this._font.ascender / 1000 * this._fontSize);
      if ((_base = this.page.fonts)[_name = this._font.id] == null) {
        _base[_name] = this._font.ref;
      }
      this._font.use(text);
      this.addContent("BT");
      this.addContent("" + x + " " + y + " Td");
      this.addContent("/" + this._font.id + " " + this._fontSize + " Tf");
      mode = options.fill && options.stroke ? 2 : options.stroke ? 1 : 0;
      if (mode !== state.mode) {
        this.addContent("" + mode + " Tr");
      }
      if (characterSpacing !== state.characterSpacing) {
        this.addContent(characterSpacing + ' Tc');
      }
      if (wordSpacing) {
        words = text.trim().split(/\s+/);
        wordSpacing += this.widthOfString(' ') + characterSpacing;
        wordSpacing *= 1000 / this._fontSize;
        commands = [];
        for (_i = 0, _len = words.length; _i < _len; _i++) {
          word = words[_i];
          encoded = this._font.encode(word);
          encoded = ((function() {
            var _j, _ref, _results;
            _results = [];
            for (i = _j = 0, _ref = encoded.length; _j < _ref; i = _j += 1) {
              _results.push(encoded.charCodeAt(i).toString(16));
            }
            return _results;
          })()).join('');
          commands.push("<" + encoded + "> " + (-wordSpacing));
        }
        this.addContent("[" + (commands.join(' ')) + "] TJ");
      } else {
        encoded = this._font.encode(text);
        encoded = ((function() {
          var _j, _ref, _results;
          _results = [];
          for (i = _j = 0, _ref = encoded.length; _j < _ref; i = _j += 1) {
            _results.push(encoded.charCodeAt(i).toString(16));
          }
          return _results;
        })()).join('');
        this.addContent("<" + encoded + "> Tj");
      }
      this.addContent("ET");
      this.restore();
      state.mode = mode;
      return state.characterSpacing = characterSpacing;
    }
  };

}).call(this);

},{"../line_wrapper":41}],47:[function(_dereq_,module,exports){
// Generated by CoffeeScript 1.7.1
(function() {
  var KAPPA, SVGPath,
    __slice = [].slice;

  SVGPath = _dereq_('../path');

  KAPPA = 4.0 * ((Math.sqrt(2) - 1.0) / 3.0);

  module.exports = {
    initVector: function() {
      this._ctm = [1, 0, 0, 1, 0, 0];
      return this._ctmStack = [];
    },
    save: function() {
      this._ctmStack.push(this._ctm.slice());
      return this.addContent('q');
    },
    restore: function() {
      this._ctm = this._ctmStack.pop() || [1, 0, 0, 1, 0, 0];
      return this.addContent('Q');
    },
    closePath: function() {
      return this.addContent('h');
    },
    lineWidth: function(w) {
      return this.addContent("" + w + " w");
    },
    _CAP_STYLES: {
      BUTT: 0,
      ROUND: 1,
      SQUARE: 2
    },
    lineCap: function(c) {
      if (typeof c === 'string') {
        c = this._CAP_STYLES[c.toUpperCase()];
      }
      return this.addContent("" + c + " J");
    },
    _JOIN_STYLES: {
      MITER: 0,
      ROUND: 1,
      BEVEL: 2
    },
    lineJoin: function(j) {
      if (typeof j === 'string') {
        j = this._JOIN_STYLES[j.toUpperCase()];
      }
      return this.addContent("" + j + " j");
    },
    miterLimit: function(m) {
      return this.addContent("" + m + " M");
    },
    dash: function(length, options) {
      var phase, space, _ref;
      if (options == null) {
        options = {};
      }
      if (length == null) {
        return this;
      }
      space = (_ref = options.space) != null ? _ref : length;
      phase = options.phase || 0;
      return this.addContent("[" + length + " " + space + "] " + phase + " d");
    },
    undash: function() {
      return this.addContent("[] 0 d");
    },
    moveTo: function(x, y) {
      return this.addContent("" + x + " " + y + " m");
    },
    lineTo: function(x, y) {
      return this.addContent("" + x + " " + y + " l");
    },
    bezierCurveTo: function(cp1x, cp1y, cp2x, cp2y, x, y) {
      return this.addContent("" + cp1x + " " + cp1y + " " + cp2x + " " + cp2y + " " + x + " " + y + " c");
    },
    quadraticCurveTo: function(cpx, cpy, x, y) {
      return this.addContent("" + cpx + " " + cpy + " " + x + " " + y + " v");
    },
    rect: function(x, y, w, h) {
      return this.addContent("" + x + " " + y + " " + w + " " + h + " re");
    },
    roundedRect: function(x, y, w, h, r) {
      if (r == null) {
        r = 0;
      }
      this.moveTo(x + r, y);
      this.lineTo(x + w - r, y);
      this.quadraticCurveTo(x + w, y, x + w, y + r);
      this.lineTo(x + w, y + h - r);
      this.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      this.lineTo(x + r, y + h);
      this.quadraticCurveTo(x, y + h, x, y + h - r);
      this.lineTo(x, y + r);
      return this.quadraticCurveTo(x, y, x + r, y);
    },
    ellipse: function(x, y, r1, r2) {
      var ox, oy, xe, xm, ye, ym;
      if (r2 == null) {
        r2 = r1;
      }
      x -= r1;
      y -= r2;
      ox = r1 * KAPPA;
      oy = r2 * KAPPA;
      xe = x + r1 * 2;
      ye = y + r2 * 2;
      xm = x + r1;
      ym = y + r2;
      this.moveTo(x, ym);
      this.bezierCurveTo(x, ym - oy, xm - ox, y, xm, y);
      this.bezierCurveTo(xm + ox, y, xe, ym - oy, xe, ym);
      this.bezierCurveTo(xe, ym + oy, xm + ox, ye, xm, ye);
      this.bezierCurveTo(xm - ox, ye, x, ym + oy, x, ym);
      return this.closePath();
    },
    circle: function(x, y, radius) {
      return this.ellipse(x, y, radius);
    },
    polygon: function() {
      var point, points, _i, _len;
      points = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      this.moveTo.apply(this, points.shift());
      for (_i = 0, _len = points.length; _i < _len; _i++) {
        point = points[_i];
        this.lineTo.apply(this, point);
      }
      return this.closePath();
    },
    path: function(path) {
      SVGPath.apply(this, path);
      return this;
    },
    _windingRule: function(rule) {
      if (/even-?odd/.test(rule)) {
        return '*';
      }
      return '';
    },
    fill: function(color, rule) {
      if (/(even-?odd)|(non-?zero)/.test(color)) {
        rule = color;
        color = null;
      }
      if (color) {
        this.fillColor(color);
      }
      return this.addContent('f' + this._windingRule(rule));
    },
    stroke: function(color) {
      if (color) {
        this.strokeColor(color);
      }
      return this.addContent('S');
    },
    fillAndStroke: function(fillColor, strokeColor, rule) {
      var isFillRule;
      if (strokeColor == null) {
        strokeColor = fillColor;
      }
      isFillRule = /(even-?odd)|(non-?zero)/;
      if (isFillRule.test(fillColor)) {
        rule = fillColor;
        fillColor = null;
      }
      if (isFillRule.test(strokeColor)) {
        rule = strokeColor;
        strokeColor = fillColor;
      }
      if (fillColor) {
        this.fillColor(fillColor);
        this.strokeColor(strokeColor);
      }
      return this.addContent('B' + this._windingRule(rule));
    },
    clip: function(rule) {
      return this.addContent('W' + this._windingRule(rule) + ' n');
    },
    transform: function(m11, m12, m21, m22, dx, dy) {
      var m, m0, m1, m2, m3, m4, m5, v, values;
      m = this._ctm;
      m0 = m[0], m1 = m[1], m2 = m[2], m3 = m[3], m4 = m[4], m5 = m[5];
      m[0] = m0 * m11 + m2 * m12;
      m[1] = m1 * m11 + m3 * m12;
      m[2] = m0 * m21 + m2 * m22;
      m[3] = m1 * m21 + m3 * m22;
      m[4] = m0 * dx + m2 * dy + m4;
      m[5] = m1 * dx + m3 * dy + m5;
      values = ((function() {
        var _i, _len, _ref, _results;
        _ref = [m11, m12, m21, m22, dx, dy];
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          v = _ref[_i];
          _results.push(+v.toFixed(5));
        }
        return _results;
      })()).join(' ');
      return this.addContent("" + values + " cm");
    },
    translate: function(x, y) {
      return this.transform(1, 0, 0, 1, x, y);
    },
    rotate: function(angle, options) {
      var cos, rad, sin, x, x1, y, y1, _ref;
      if (options == null) {
        options = {};
      }
      rad = angle * Math.PI / 180;
      cos = Math.cos(rad);
      sin = Math.sin(rad);
      x = y = 0;
      if (options.origin != null) {
        _ref = options.origin, x = _ref[0], y = _ref[1];
        x1 = x * cos - y * sin;
        y1 = x * sin + y * cos;
        x -= x1;
        y -= y1;
      }
      return this.transform(cos, sin, -sin, cos, x, y);
    },
    scale: function(xFactor, yFactor, options) {
      var x, y, _ref;
      if (yFactor == null) {
        yFactor = xFactor;
      }
      if (options == null) {
        options = {};
      }
      if (arguments.length === 2) {
        yFactor = xFactor;
        options = yFactor;
      }
      x = y = 0;
      if (options.origin != null) {
        _ref = options.origin, x = _ref[0], y = _ref[1];
        x -= xFactor * x;
        y -= yFactor * y;
      }
      return this.transform(xFactor, 0, 0, yFactor, x, y);
    }
  };

}).call(this);

},{"../path":50}],48:[function(_dereq_,module,exports){
(function (Buffer){
// Generated by CoffeeScript 1.7.1

/*
PDFObject - converts JavaScript types into their corrisponding PDF types.
By Devon Govett
 */

(function() {
  var PDFObject, PDFReference;

  PDFObject = (function() {
    var pad, swapBytes;

    function PDFObject() {}

    pad = function(str, length) {
      return (Array(length + 1).join('0') + str).slice(-length);
    };

    PDFObject.convert = function(object) {
      var e, items, key, out, val;
      if (Array.isArray(object)) {
        items = ((function() {
          var _i, _len, _results;
          _results = [];
          for (_i = 0, _len = object.length; _i < _len; _i++) {
            e = object[_i];
            _results.push(PDFObject.convert(e));
          }
          return _results;
        })()).join(' ');
        return '[' + items + ']';
      } else if (typeof object === 'string') {
        return '/' + object;
      } else if (object != null ? object.isString : void 0) {
        return '(' + object + ')';
      } else if (object instanceof PDFReference) {
        return object.toString();
      } else if (object instanceof Date) {
        return '(D:' + pad(object.getUTCFullYear(), 4) + pad(object.getUTCMonth(), 2) + pad(object.getUTCDate(), 2) + pad(object.getUTCHours(), 2) + pad(object.getUTCMinutes(), 2) + pad(object.getUTCSeconds(), 2) + 'Z)';
      } else if ({}.toString.call(object) === '[object Object]') {
        out = ['<<'];
        for (key in object) {
          val = object[key];
          out.push('/' + key + ' ' + PDFObject.convert(val));
        }
        out.push('>>');
        return out.join('\n');
      } else {
        return '' + object;
      }
    };

    swapBytes = function(buff) {
      var a, i, l, _i, _ref;
      l = buff.length;
      if (l & 0x01) {
        throw new Error("Buffer length must be even");
      } else {
        for (i = _i = 0, _ref = l - 1; _i < _ref; i = _i += 2) {
          a = buff[i];
          buff[i] = buff[i + 1];
          buff[i + 1] = a;
        }
      }
      return buff;
    };

    PDFObject.s = function(string, swap) {
      if (swap == null) {
        swap = false;
      }
      string = string.replace(/\\/g, '\\\\\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
      if (swap) {
        string = swapBytes(new Buffer('\ufeff' + string, 'ucs-2')).toString('binary');
      }
      return {
        isString: true,
        toString: function() {
          return string;
        }
      };
    };

    return PDFObject;

  })();

  module.exports = PDFObject;

  PDFReference = _dereq_('./reference');

}).call(this);

}).call(this,_dereq_("buffer").Buffer)
},{"./reference":51,"buffer":1}],49:[function(_dereq_,module,exports){
// Generated by CoffeeScript 1.7.1

/*
PDFPage - represents a single page in the PDF document
By Devon Govett
 */

(function() {
  var PDFPage;

  PDFPage = (function() {
    var DEFAULT_MARGINS, SIZES;

    function PDFPage(document, options) {
      var dimensions;
      this.document = document;
      if (options == null) {
        options = {};
      }
      this.size = options.size || 'letter';
      this.layout = options.layout || 'portrait';
      if (typeof options.margin === 'number') {
        this.margins = {
          top: options.margin,
          left: options.margin,
          bottom: options.margin,
          right: options.margin
        };
      } else {
        this.margins = options.margins || DEFAULT_MARGINS;
      }
      dimensions = Array.isArray(this.size) ? this.size : SIZES[this.size.toUpperCase()];
      this.width = dimensions[this.layout === 'portrait' ? 0 : 1];
      this.height = dimensions[this.layout === 'portrait' ? 1 : 0];
      this.content = this.document.ref();
      this.resources = this.document.ref({
        ProcSet: ['PDF', 'Text', 'ImageB', 'ImageC', 'ImageI']
      });
      Object.defineProperties(this, {
        fonts: {
          get: (function(_this) {
            return function() {
              var _base;
              return (_base = _this.resources.data).Font != null ? _base.Font : _base.Font = {};
            };
          })(this)
        },
        xobjects: {
          get: (function(_this) {
            return function() {
              var _base;
              return (_base = _this.resources.data).XObject != null ? _base.XObject : _base.XObject = {};
            };
          })(this)
        },
        ext_gstates: {
          get: (function(_this) {
            return function() {
              var _base;
              return (_base = _this.resources.data).ExtGState != null ? _base.ExtGState : _base.ExtGState = {};
            };
          })(this)
        },
        patterns: {
          get: (function(_this) {
            return function() {
              var _base;
              return (_base = _this.resources.data).Pattern != null ? _base.Pattern : _base.Pattern = {};
            };
          })(this)
        },
        annotations: {
          get: (function(_this) {
            return function() {
              var _base;
              return (_base = _this.dictionary.data).Annots != null ? _base.Annots : _base.Annots = [];
            };
          })(this)
        }
      });
      this.dictionary = this.document.ref({
        Type: 'Page',
        Parent: this.document._root.data.Pages,
        MediaBox: [0, 0, this.width, this.height],
        Contents: this.content,
        Resources: this.resources
      });
    }

    PDFPage.prototype.maxY = function() {
      return this.height - this.margins.bottom;
    };

    PDFPage.prototype.write = function(chunk) {
      return this.content.write(chunk);
    };

    PDFPage.prototype.end = function() {
      this.dictionary.end();
      this.resources.end();
      return this.content.end();
    };

    DEFAULT_MARGINS = {
      top: 72,
      left: 72,
      bottom: 72,
      right: 72
    };

    SIZES = {
      '4A0': [4767.87, 6740.79],
      '2A0': [3370.39, 4767.87],
      A0: [2383.94, 3370.39],
      A1: [1683.78, 2383.94],
      A2: [1190.55, 1683.78],
      A3: [841.89, 1190.55],
      A4: [595.28, 841.89],
      A5: [419.53, 595.28],
      A6: [297.64, 419.53],
      A7: [209.76, 297.64],
      A8: [147.40, 209.76],
      A9: [104.88, 147.40],
      A10: [73.70, 104.88],
      B0: [2834.65, 4008.19],
      B1: [2004.09, 2834.65],
      B2: [1417.32, 2004.09],
      B3: [1000.63, 1417.32],
      B4: [708.66, 1000.63],
      B5: [498.90, 708.66],
      B6: [354.33, 498.90],
      B7: [249.45, 354.33],
      B8: [175.75, 249.45],
      B9: [124.72, 175.75],
      B10: [87.87, 124.72],
      C0: [2599.37, 3676.54],
      C1: [1836.85, 2599.37],
      C2: [1298.27, 1836.85],
      C3: [918.43, 1298.27],
      C4: [649.13, 918.43],
      C5: [459.21, 649.13],
      C6: [323.15, 459.21],
      C7: [229.61, 323.15],
      C8: [161.57, 229.61],
      C9: [113.39, 161.57],
      C10: [79.37, 113.39],
      RA0: [2437.80, 3458.27],
      RA1: [1729.13, 2437.80],
      RA2: [1218.90, 1729.13],
      RA3: [864.57, 1218.90],
      RA4: [609.45, 864.57],
      SRA0: [2551.18, 3628.35],
      SRA1: [1814.17, 2551.18],
      SRA2: [1275.59, 1814.17],
      SRA3: [907.09, 1275.59],
      SRA4: [637.80, 907.09],
      EXECUTIVE: [521.86, 756.00],
      FOLIO: [612.00, 936.00],
      LEGAL: [612.00, 1008.00],
      LETTER: [612.00, 792.00],
      TABLOID: [792.00, 1224.00]
    };

    return PDFPage;

  })();

  module.exports = PDFPage;

}).call(this);

},{}],50:[function(_dereq_,module,exports){
// Generated by CoffeeScript 1.7.1
(function() {
  var SVGPath;

  SVGPath = (function() {
    var apply, arcToSegments, cx, cy, parameters, parse, px, py, runners, segmentToBezier, solveArc, sx, sy;

    function SVGPath() {}

    SVGPath.apply = function(doc, path) {
      var commands;
      commands = parse(path);
      return apply(commands, doc);
    };

    parameters = {
      A: 7,
      a: 7,
      C: 6,
      c: 6,
      H: 1,
      h: 1,
      L: 2,
      l: 2,
      M: 2,
      m: 2,
      Q: 4,
      q: 4,
      S: 4,
      s: 4,
      T: 2,
      t: 2,
      V: 1,
      v: 1,
      Z: 0,
      z: 0
    };

    parse = function(path) {
      var args, c, cmd, curArg, foundDecimal, params, ret, _i, _len;
      ret = [];
      args = [];
      curArg = "";
      foundDecimal = false;
      params = 0;
      for (_i = 0, _len = path.length; _i < _len; _i++) {
        c = path[_i];
        if (parameters[c] != null) {
          params = parameters[c];
          if (cmd) {
            if (curArg.length > 0) {
              args[args.length] = +curArg;
            }
            ret[ret.length] = {
              cmd: cmd,
              args: args
            };
            args = [];
            curArg = "";
            foundDecimal = false;
          }
          cmd = c;
        } else if ((c === " " || c === ",") || (c === "-" && curArg.length > 0 && curArg[curArg.length - 1] !== 'e') || (c === "." && foundDecimal)) {
          if (curArg.length === 0) {
            continue;
          }
          if (args.length === params) {
            ret[ret.length] = {
              cmd: cmd,
              args: args
            };
            args = [+curArg];
            if (cmd === "M") {
              cmd = "L";
            }
            if (cmd === "m") {
              cmd = "l";
            }
          } else {
            args[args.length] = +curArg;
          }
          foundDecimal = c === ".";
          curArg = c === '-' || c === '.' ? c : '';
        } else {
          curArg += c;
          if (c === '.') {
            foundDecimal = true;
          }
        }
      }
      if (curArg.length > 0) {
        if (args.length === params) {
          ret[ret.length] = {
            cmd: cmd,
            args: args
          };
          args = [+curArg];
          if (cmd === "M") {
            cmd = "L";
          }
          if (cmd === "m") {
            cmd = "l";
          }
        } else {
          args[args.length] = +curArg;
        }
      }
      ret[ret.length] = {
        cmd: cmd,
        args: args
      };
      return ret;
    };

    cx = cy = px = py = sx = sy = 0;

    apply = function(commands, doc) {
      var c, i, _i, _len, _name;
      cx = cy = px = py = sx = sy = 0;
      for (i = _i = 0, _len = commands.length; _i < _len; i = ++_i) {
        c = commands[i];
        if (typeof runners[_name = c.cmd] === "function") {
          runners[_name](doc, c.args);
        }
      }
      return cx = cy = px = py = 0;
    };

    runners = {
      M: function(doc, a) {
        cx = a[0];
        cy = a[1];
        px = py = null;
        sx = cx;
        sy = cy;
        return doc.moveTo(cx, cy);
      },
      m: function(doc, a) {
        cx += a[0];
        cy += a[1];
        px = py = null;
        sx = cx;
        sy = cy;
        return doc.moveTo(cx, cy);
      },
      C: function(doc, a) {
        cx = a[4];
        cy = a[5];
        px = a[2];
        py = a[3];
        return doc.bezierCurveTo.apply(doc, a);
      },
      c: function(doc, a) {
        doc.bezierCurveTo(a[0] + cx, a[1] + cy, a[2] + cx, a[3] + cy, a[4] + cx, a[5] + cy);
        px = cx + a[2];
        py = cy + a[3];
        cx += a[4];
        return cy += a[5];
      },
      S: function(doc, a) {
        if (px === null) {
          px = cx;
          py = cy;
        }
        doc.bezierCurveTo(cx - (px - cx), cy - (py - cy), a[0], a[1], a[2], a[3]);
        px = a[0];
        py = a[1];
        cx = a[2];
        return cy = a[3];
      },
      s: function(doc, a) {
        if (px === null) {
          px = cx;
          py = cy;
        }
        doc.bezierCurveTo(cx - (px - cx), cy - (py - cy), cx + a[0], cy + a[1], cx + a[2], cy + a[3]);
        px = cx + a[0];
        py = cy + a[1];
        cx += a[2];
        return cy += a[3];
      },
      Q: function(doc, a) {
        px = a[0];
        py = a[1];
        cx = a[2];
        cy = a[3];
        return doc.quadraticCurveTo(a[0], a[1], cx, cy);
      },
      q: function(doc, a) {
        doc.quadraticCurveTo(a[0] + cx, a[1] + cy, a[2] + cx, a[3] + cy);
        px = cx + a[0];
        py = cy + a[1];
        cx += a[2];
        return cy += a[3];
      },
      T: function(doc, a) {
        if (px === null) {
          px = cx;
          py = cy;
        } else {
          px = cx - (px - cx);
          py = cy - (py - cy);
        }
        doc.quadraticCurveTo(px, py, a[0], a[1]);
        px = cx - (px - cx);
        py = cy - (py - cy);
        cx = a[0];
        return cy = a[1];
      },
      t: function(doc, a) {
        if (px === null) {
          px = cx;
          py = cy;
        } else {
          px = cx - (px - cx);
          py = cy - (py - cy);
        }
        doc.quadraticCurveTo(px, py, cx + a[0], cy + a[1]);
        cx += a[0];
        return cy += a[1];
      },
      A: function(doc, a) {
        solveArc(doc, cx, cy, a);
        cx = a[5];
        return cy = a[6];
      },
      a: function(doc, a) {
        a[5] += cx;
        a[6] += cy;
        solveArc(doc, cx, cy, a);
        cx = a[5];
        return cy = a[6];
      },
      L: function(doc, a) {
        cx = a[0];
        cy = a[1];
        px = py = null;
        return doc.lineTo(cx, cy);
      },
      l: function(doc, a) {
        cx += a[0];
        cy += a[1];
        px = py = null;
        return doc.lineTo(cx, cy);
      },
      H: function(doc, a) {
        cx = a[0];
        px = py = null;
        return doc.lineTo(cx, cy);
      },
      h: function(doc, a) {
        cx += a[0];
        px = py = null;
        return doc.lineTo(cx, cy);
      },
      V: function(doc, a) {
        cy = a[0];
        px = py = null;
        return doc.lineTo(cx, cy);
      },
      v: function(doc, a) {
        cy += a[0];
        px = py = null;
        return doc.lineTo(cx, cy);
      },
      Z: function(doc) {
        doc.closePath();
        cx = sx;
        return cy = sy;
      },
      z: function(doc) {
        doc.closePath();
        cx = sx;
        return cy = sy;
      }
    };

    solveArc = function(doc, x, y, coords) {
      var bez, ex, ey, large, rot, rx, ry, seg, segs, sweep, _i, _len, _results;
      rx = coords[0], ry = coords[1], rot = coords[2], large = coords[3], sweep = coords[4], ex = coords[5], ey = coords[6];
      segs = arcToSegments(ex, ey, rx, ry, large, sweep, rot, x, y);
      _results = [];
      for (_i = 0, _len = segs.length; _i < _len; _i++) {
        seg = segs[_i];
        bez = segmentToBezier.apply(null, seg);
        _results.push(doc.bezierCurveTo.apply(doc, bez));
      }
      return _results;
    };

    arcToSegments = function(x, y, rx, ry, large, sweep, rotateX, ox, oy) {
      var a00, a01, a10, a11, cos_th, d, i, pl, result, segments, sfactor, sfactor_sq, sin_th, th, th0, th1, th2, th3, th_arc, x0, x1, xc, y0, y1, yc, _i;
      th = rotateX * (Math.PI / 180);
      sin_th = Math.sin(th);
      cos_th = Math.cos(th);
      rx = Math.abs(rx);
      ry = Math.abs(ry);
      px = cos_th * (ox - x) * 0.5 + sin_th * (oy - y) * 0.5;
      py = cos_th * (oy - y) * 0.5 - sin_th * (ox - x) * 0.5;
      pl = (px * px) / (rx * rx) + (py * py) / (ry * ry);
      if (pl > 1) {
        pl = Math.sqrt(pl);
        rx *= pl;
        ry *= pl;
      }
      a00 = cos_th / rx;
      a01 = sin_th / rx;
      a10 = (-sin_th) / ry;
      a11 = cos_th / ry;
      x0 = a00 * ox + a01 * oy;
      y0 = a10 * ox + a11 * oy;
      x1 = a00 * x + a01 * y;
      y1 = a10 * x + a11 * y;
      d = (x1 - x0) * (x1 - x0) + (y1 - y0) * (y1 - y0);
      sfactor_sq = 1 / d - 0.25;
      if (sfactor_sq < 0) {
        sfactor_sq = 0;
      }
      sfactor = Math.sqrt(sfactor_sq);
      if (sweep === large) {
        sfactor = -sfactor;
      }
      xc = 0.5 * (x0 + x1) - sfactor * (y1 - y0);
      yc = 0.5 * (y0 + y1) + sfactor * (x1 - x0);
      th0 = Math.atan2(y0 - yc, x0 - xc);
      th1 = Math.atan2(y1 - yc, x1 - xc);
      th_arc = th1 - th0;
      if (th_arc < 0 && sweep === 1) {
        th_arc += 2 * Math.PI;
      } else if (th_arc > 0 && sweep === 0) {
        th_arc -= 2 * Math.PI;
      }
      segments = Math.ceil(Math.abs(th_arc / (Math.PI * 0.5 + 0.001)));
      result = [];
      for (i = _i = 0; 0 <= segments ? _i < segments : _i > segments; i = 0 <= segments ? ++_i : --_i) {
        th2 = th0 + i * th_arc / segments;
        th3 = th0 + (i + 1) * th_arc / segments;
        result[i] = [xc, yc, th2, th3, rx, ry, sin_th, cos_th];
      }
      return result;
    };

    segmentToBezier = function(cx, cy, th0, th1, rx, ry, sin_th, cos_th) {
      var a00, a01, a10, a11, t, th_half, x1, x2, x3, y1, y2, y3;
      a00 = cos_th * rx;
      a01 = -sin_th * ry;
      a10 = sin_th * rx;
      a11 = cos_th * ry;
      th_half = 0.5 * (th1 - th0);
      t = (8 / 3) * Math.sin(th_half * 0.5) * Math.sin(th_half * 0.5) / Math.sin(th_half);
      x1 = cx + Math.cos(th0) - t * Math.sin(th0);
      y1 = cy + Math.sin(th0) + t * Math.cos(th0);
      x3 = cx + Math.cos(th1);
      y3 = cy + Math.sin(th1);
      x2 = x3 + t * Math.sin(th1);
      y2 = y3 - t * Math.cos(th1);
      return [a00 * x1 + a01 * y1, a10 * x1 + a11 * y1, a00 * x2 + a01 * y2, a10 * x2 + a11 * y2, a00 * x3 + a01 * y3, a10 * x3 + a11 * y3];
    };

    return SVGPath;

  })();

  module.exports = SVGPath;

}).call(this);

},{}],51:[function(_dereq_,module,exports){
(function (Buffer){
// Generated by CoffeeScript 1.7.1

/*
PDFReference - represents a reference to another object in the PDF object heirarchy
By Devon Govett
 */

(function() {
  var PDFObject, PDFReference, zlib,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  zlib = _dereq_('zlib');

  PDFReference = (function() {
    function PDFReference(document, id, data) {
      this.document = document;
      this.id = id;
      this.data = data != null ? data : {};
      this.finalize = __bind(this.finalize, this);
      this.gen = 0;
      this.deflate = null;
      this.compress = this.document.compress && !this.data.Filter;
      this.uncompressedLength = 0;
      this.chunks = [];
    }

    PDFReference.prototype.initDeflate = function() {
      this.data.Filter = 'FlateDecode';
      return this.deflate = {
        write: (function(_this) {
          return function(chunk) {
            _this.chunks.push(chunk);
            return _this.data.Length += chunk.length;
          };
        })(this),
        end: (function(_this) {
          return function() {
            return zlib.deflate(Buffer.concat(_this.chunks), function(err, data) {
              if (err) {
                throw err;
              }
              _this.chunks = [data];
              _this.data.Length = data.length;
              return _this.finalize();
            });
          };
        })(this)
      };
    };

    PDFReference.prototype.write = function(chunk) {
      var _base;
      if (!Buffer.isBuffer(chunk)) {
        chunk = new Buffer(chunk + '\n', 'binary');
      }
      this.uncompressedLength += chunk.length;
      if ((_base = this.data).Length == null) {
        _base.Length = 0;
      }
      if (this.compress) {
        if (!this.deflate) {
          this.initDeflate();
        }
        return this.deflate.write(chunk);
      } else {
        this.chunks.push(chunk);
        return this.data.Length += chunk.length;
      }
    };

    PDFReference.prototype.end = function(chunk) {
      if (typeof chunk === 'string' || Buffer.isBuffer(chunk)) {
        this.write(chunk);
      }
      if (this.deflate) {
        return this.deflate.end();
      } else {
        return this.finalize();
      }
    };

    PDFReference.prototype.finalize = function() {
      var chunk, _i, _len, _ref;
      this.offset = this.document._offset;
      this.document._write("" + this.id + " " + this.gen + " obj");
      this.document._write(PDFObject.convert(this.data));
      if (this.chunks.length) {
        this.document._write('stream');
        _ref = this.chunks;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          chunk = _ref[_i];
          this.document._write(chunk);
        }
        this.chunks.length = 0;
        this.document._write('\nendstream');
      }
      this.document._write('endobj');
      return this.document._refEnd(this);
    };

    PDFReference.prototype.toString = function() {
      return "" + this.id + " " + this.gen + " R";
    };

    return PDFReference;

  })();

  module.exports = PDFReference;

  PDFObject = _dereq_('./object');

}).call(this);

}).call(this,_dereq_("buffer").Buffer)
},{"./object":48,"buffer":1,"zlib":15}],52:[function(_dereq_,module,exports){
// Generated by CoffeeScript 1.7.1
(function() {
  var AI, AL, B2, BA, BB, BK, CB, CJ, CL, CM, CP, CR, CharRange, EX, GL, H2, H3, HL, HY, ID, IN, IS, JL, JT, JV, LF, NL, NS, NU, OP, PO, PR, QU, RI, SA, SG, SP, SY, WJ, XX, ZW;

  exports.OP = OP = 0;

  exports.CL = CL = 1;

  exports.CP = CP = 2;

  exports.QU = QU = 3;

  exports.GL = GL = 4;

  exports.NS = NS = 5;

  exports.EX = EX = 6;

  exports.SY = SY = 7;

  exports.IS = IS = 8;

  exports.PR = PR = 9;

  exports.PO = PO = 10;

  exports.NU = NU = 11;

  exports.AL = AL = 12;

  exports.HL = HL = 13;

  exports.ID = ID = 14;

  exports.IN = IN = 15;

  exports.HY = HY = 16;

  exports.BA = BA = 17;

  exports.BB = BB = 18;

  exports.B2 = B2 = 19;

  exports.ZW = ZW = 20;

  exports.CM = CM = 21;

  exports.WJ = WJ = 22;

  exports.H2 = H2 = 23;

  exports.H3 = H3 = 24;

  exports.JL = JL = 25;

  exports.JV = JV = 26;

  exports.JT = JT = 27;

  exports.RI = RI = 28;

  exports.AI = AI = 29;

  exports.BK = BK = 30;

  exports.CB = CB = 31;

  exports.CJ = CJ = 32;

  exports.CR = CR = 33;

  exports.LF = LF = 34;

  exports.NL = NL = 35;

  exports.SA = SA = 36;

  exports.SG = SG = 37;

  exports.SP = SP = 38;

  exports.XX = XX = 39;

  CharRange = (function() {
    function CharRange(start, end, _class) {
      this.start = start;
      this.end = end;
      this["class"] = _class;
    }

    return CharRange;

  })();

  exports.characterClasses = [new CharRange(0x0000, 0x0008, CM), new CharRange(0x0009, 0x0009, BA), new CharRange(0x000A, 0x000A, LF), new CharRange(0x000B, 0x000C, BK), new CharRange(0x000D, 0x000D, CR), new CharRange(0x000E, 0x001F, CM), new CharRange(0x0020, 0x0020, SP), new CharRange(0x0021, 0x0021, EX), new CharRange(0x0022, 0x0022, QU), new CharRange(0x0023, 0x0023, AL), new CharRange(0x0024, 0x0024, PR), new CharRange(0x0025, 0x0025, PO), new CharRange(0x0026, 0x0026, AL), new CharRange(0x0027, 0x0027, QU), new CharRange(0x0028, 0x0028, OP), new CharRange(0x0029, 0x0029, CP), new CharRange(0x002A, 0x002A, AL), new CharRange(0x002B, 0x002B, PR), new CharRange(0x002C, 0x002C, IS), new CharRange(0x002D, 0x002D, HY), new CharRange(0x002E, 0x002E, IS), new CharRange(0x002F, 0x002F, SY), new CharRange(0x0030, 0x0039, NU), new CharRange(0x003A, 0x003B, IS), new CharRange(0x003C, 0x003E, AL), new CharRange(0x003F, 0x003F, EX), new CharRange(0x0040, 0x005A, AL), new CharRange(0x005B, 0x005B, OP), new CharRange(0x005C, 0x005C, PR), new CharRange(0x005D, 0x005D, CP), new CharRange(0x005E, 0x007A, AL), new CharRange(0x007B, 0x007B, OP), new CharRange(0x007C, 0x007C, BA), new CharRange(0x007D, 0x007D, CL), new CharRange(0x007E, 0x007E, AL), new CharRange(0x007F, 0x0084, CM), new CharRange(0x0085, 0x0085, NL), new CharRange(0x0086, 0x009F, CM), new CharRange(0x00A0, 0x00A0, GL), new CharRange(0x00A1, 0x00A1, OP), new CharRange(0x00A2, 0x00A2, PO), new CharRange(0x00A3, 0x00A5, PR), new CharRange(0x00A6, 0x00A6, AL), new CharRange(0x00A7, 0x00A8, AI), new CharRange(0x00A9, 0x00A9, AL), new CharRange(0x00AA, 0x00AA, AI), new CharRange(0x00AB, 0x00AB, QU), new CharRange(0x00AC, 0x00AC, AL), new CharRange(0x00AD, 0x00AD, BA), new CharRange(0x00AE, 0x00AF, AL), new CharRange(0x00B0, 0x00B0, PO), new CharRange(0x00B1, 0x00B1, PR), new CharRange(0x00B2, 0x00B3, AI), new CharRange(0x00B4, 0x00B4, BB), new CharRange(0x00B5, 0x00B5, AL), new CharRange(0x00B6, 0x00BA, AI), new CharRange(0x00BB, 0x00BB, QU), new CharRange(0x00BC, 0x00BE, AI), new CharRange(0x00BF, 0x00BF, OP), new CharRange(0x00C0, 0x00D6, AL), new CharRange(0x00D7, 0x00D7, AI), new CharRange(0x00D8, 0x00F6, AL), new CharRange(0x00F7, 0x00F7, AI), new CharRange(0x00F8, 0x02C6, AL), new CharRange(0x02C7, 0x02C7, AI), new CharRange(0x02C8, 0x02C8, BB), new CharRange(0x02C9, 0x02CB, AI), new CharRange(0x02CC, 0x02CC, BB), new CharRange(0x02CD, 0x02CD, AI), new CharRange(0x02CE, 0x02CF, AL), new CharRange(0x02D0, 0x02D0, AI), new CharRange(0x02D1, 0x02D7, AL), new CharRange(0x02D8, 0x02DB, AI), new CharRange(0x02DC, 0x02DC, AL), new CharRange(0x02DD, 0x02DD, AI), new CharRange(0x02DE, 0x02DE, AL), new CharRange(0x02DF, 0x02DF, BB), new CharRange(0x02E0, 0x02FF, AL), new CharRange(0x0300, 0x034E, CM), new CharRange(0x034F, 0x034F, GL), new CharRange(0x0350, 0x035B, CM), new CharRange(0x035C, 0x0362, GL), new CharRange(0x0363, 0x036F, CM), new CharRange(0x0370, 0x037D, AL), new CharRange(0x037E, 0x037E, IS), new CharRange(0x0384, 0x0482, AL), new CharRange(0x0483, 0x0489, CM), new CharRange(0x048A, 0x0587, AL), new CharRange(0x0589, 0x0589, IS), new CharRange(0x058A, 0x058A, BA), new CharRange(0x058F, 0x058F, PR), new CharRange(0x0591, 0x05BD, CM), new CharRange(0x05BE, 0x05BE, BA), new CharRange(0x05BF, 0x05BF, CM), new CharRange(0x05C0, 0x05C0, AL), new CharRange(0x05C1, 0x05C2, CM), new CharRange(0x05C3, 0x05C3, AL), new CharRange(0x05C4, 0x05C5, CM), new CharRange(0x05C6, 0x05C6, EX), new CharRange(0x05C7, 0x05C7, CM), new CharRange(0x05D0, 0x05F2, HL), new CharRange(0x05F3, 0x0608, AL), new CharRange(0x0609, 0x060B, PO), new CharRange(0x060C, 0x060D, IS), new CharRange(0x060E, 0x060F, AL), new CharRange(0x0610, 0x061A, CM), new CharRange(0x061B, 0x061F, EX), new CharRange(0x0620, 0x064A, AL), new CharRange(0x064B, 0x065F, CM), new CharRange(0x0660, 0x0669, NU), new CharRange(0x066A, 0x066A, PO), new CharRange(0x066B, 0x066C, NU), new CharRange(0x066D, 0x066F, AL), new CharRange(0x0670, 0x0670, CM), new CharRange(0x0671, 0x06D3, AL), new CharRange(0x06D4, 0x06D4, EX), new CharRange(0x06D5, 0x06D5, AL), new CharRange(0x06D6, 0x06DC, CM), new CharRange(0x06DD, 0x06DE, AL), new CharRange(0x06DF, 0x06E4, CM), new CharRange(0x06E5, 0x06E6, AL), new CharRange(0x06E7, 0x06E8, CM), new CharRange(0x06E9, 0x06E9, AL), new CharRange(0x06EA, 0x06ED, CM), new CharRange(0x06EE, 0x06EF, AL), new CharRange(0x06F0, 0x06F9, NU), new CharRange(0x06FA, 0x0710, AL), new CharRange(0x0711, 0x0711, CM), new CharRange(0x0712, 0x072F, AL), new CharRange(0x0730, 0x074A, CM), new CharRange(0x074D, 0x07A5, AL), new CharRange(0x07A6, 0x07B0, CM), new CharRange(0x07B1, 0x07B1, AL), new CharRange(0x07C0, 0x07C9, NU), new CharRange(0x07CA, 0x07EA, AL), new CharRange(0x07EB, 0x07F3, CM), new CharRange(0x07F4, 0x07F7, AL), new CharRange(0x07F8, 0x07F8, IS), new CharRange(0x07F9, 0x07F9, EX), new CharRange(0x07FA, 0x0815, AL), new CharRange(0x0816, 0x0819, CM), new CharRange(0x081A, 0x081A, AL), new CharRange(0x081B, 0x0823, CM), new CharRange(0x0824, 0x0824, AL), new CharRange(0x0825, 0x0827, CM), new CharRange(0x0828, 0x0828, AL), new CharRange(0x0829, 0x082D, CM), new CharRange(0x0830, 0x0858, AL), new CharRange(0x0859, 0x085B, CM), new CharRange(0x085E, 0x08AC, AL), new CharRange(0x08E4, 0x0903, CM), new CharRange(0x0904, 0x0939, AL), new CharRange(0x093A, 0x093C, CM), new CharRange(0x093D, 0x093D, AL), new CharRange(0x093E, 0x094F, CM), new CharRange(0x0950, 0x0950, AL), new CharRange(0x0951, 0x0957, CM), new CharRange(0x0958, 0x0961, AL), new CharRange(0x0962, 0x0963, CM), new CharRange(0x0964, 0x0965, BA), new CharRange(0x0966, 0x096F, NU), new CharRange(0x0970, 0x097F, AL), new CharRange(0x0981, 0x0983, CM), new CharRange(0x0985, 0x09B9, AL), new CharRange(0x09BC, 0x09BC, CM), new CharRange(0x09BD, 0x09BD, AL), new CharRange(0x09BE, 0x09CD, CM), new CharRange(0x09CE, 0x09CE, AL), new CharRange(0x09D7, 0x09D7, CM), new CharRange(0x09DC, 0x09E1, AL), new CharRange(0x09E2, 0x09E3, CM), new CharRange(0x09E6, 0x09EF, NU), new CharRange(0x09F0, 0x09F1, AL), new CharRange(0x09F2, 0x09F3, PO), new CharRange(0x09F4, 0x09F8, AL), new CharRange(0x09F9, 0x09F9, PO), new CharRange(0x09FA, 0x09FA, AL), new CharRange(0x09FB, 0x09FB, PR), new CharRange(0x0A01, 0x0A03, CM), new CharRange(0x0A05, 0x0A39, AL), new CharRange(0x0A3C, 0x0A51, CM), new CharRange(0x0A59, 0x0A5E, AL), new CharRange(0x0A66, 0x0A6F, NU), new CharRange(0x0A70, 0x0A71, CM), new CharRange(0x0A72, 0x0A74, AL), new CharRange(0x0A75, 0x0A83, CM), new CharRange(0x0A85, 0x0AB9, AL), new CharRange(0x0ABC, 0x0ABC, CM), new CharRange(0x0ABD, 0x0ABD, AL), new CharRange(0x0ABE, 0x0ACD, CM), new CharRange(0x0AD0, 0x0AE1, AL), new CharRange(0x0AE2, 0x0AE3, CM), new CharRange(0x0AE6, 0x0AEF, NU), new CharRange(0x0AF0, 0x0AF0, AL), new CharRange(0x0AF1, 0x0AF1, PR), new CharRange(0x0B01, 0x0B03, CM), new CharRange(0x0B05, 0x0B39, AL), new CharRange(0x0B3C, 0x0B3C, CM), new CharRange(0x0B3D, 0x0B3D, AL), new CharRange(0x0B3E, 0x0B57, CM), new CharRange(0x0B5C, 0x0B61, AL), new CharRange(0x0B62, 0x0B63, CM), new CharRange(0x0B66, 0x0B6F, NU), new CharRange(0x0B70, 0x0B77, AL), new CharRange(0x0B82, 0x0B82, CM), new CharRange(0x0B83, 0x0BB9, AL), new CharRange(0x0BBE, 0x0BCD, CM), new CharRange(0x0BD0, 0x0BD0, AL), new CharRange(0x0BD7, 0x0BD7, CM), new CharRange(0x0BE6, 0x0BEF, NU), new CharRange(0x0BF0, 0x0BF8, AL), new CharRange(0x0BF9, 0x0BF9, PR), new CharRange(0x0BFA, 0x0BFA, AL), new CharRange(0x0C01, 0x0C03, CM), new CharRange(0x0C05, 0x0C3D, AL), new CharRange(0x0C3E, 0x0C56, CM), new CharRange(0x0C58, 0x0C61, AL), new CharRange(0x0C62, 0x0C63, CM), new CharRange(0x0C66, 0x0C6F, NU), new CharRange(0x0C78, 0x0C7F, AL), new CharRange(0x0C82, 0x0C83, CM), new CharRange(0x0C85, 0x0CB9, AL), new CharRange(0x0CBC, 0x0CBC, CM), new CharRange(0x0CBD, 0x0CBD, AL), new CharRange(0x0CBE, 0x0CD6, CM), new CharRange(0x0CDE, 0x0CE1, AL), new CharRange(0x0CE2, 0x0CE3, CM), new CharRange(0x0CE6, 0x0CEF, NU), new CharRange(0x0CF1, 0x0CF2, AL), new CharRange(0x0D02, 0x0D03, CM), new CharRange(0x0D05, 0x0D3D, AL), new CharRange(0x0D3E, 0x0D4D, CM), new CharRange(0x0D4E, 0x0D4E, AL), new CharRange(0x0D57, 0x0D57, CM), new CharRange(0x0D60, 0x0D61, AL), new CharRange(0x0D62, 0x0D63, CM), new CharRange(0x0D66, 0x0D6F, NU), new CharRange(0x0D70, 0x0D75, AL), new CharRange(0x0D79, 0x0D79, PO), new CharRange(0x0D7A, 0x0D7F, AL), new CharRange(0x0D82, 0x0D83, CM), new CharRange(0x0D85, 0x0DC6, AL), new CharRange(0x0DCA, 0x0DF3, CM), new CharRange(0x0DF4, 0x0DF4, AL), new CharRange(0x0E01, 0x0E3A, SA), new CharRange(0x0E3F, 0x0E3F, PR), new CharRange(0x0E40, 0x0E4E, SA), new CharRange(0x0E4F, 0x0E4F, AL), new CharRange(0x0E50, 0x0E59, NU), new CharRange(0x0E5A, 0x0E5B, BA), new CharRange(0x0E81, 0x0ECD, SA), new CharRange(0x0ED0, 0x0ED9, NU), new CharRange(0x0EDC, 0x0EDF, SA), new CharRange(0x0F00, 0x0F00, AL), new CharRange(0x0F01, 0x0F04, BB), new CharRange(0x0F05, 0x0F05, AL), new CharRange(0x0F06, 0x0F07, BB), new CharRange(0x0F08, 0x0F08, GL), new CharRange(0x0F09, 0x0F0A, BB), new CharRange(0x0F0B, 0x0F0B, BA), new CharRange(0x0F0C, 0x0F0C, GL), new CharRange(0x0F0D, 0x0F11, EX), new CharRange(0x0F12, 0x0F12, GL), new CharRange(0x0F13, 0x0F13, AL), new CharRange(0x0F14, 0x0F14, EX), new CharRange(0x0F15, 0x0F17, AL), new CharRange(0x0F18, 0x0F19, CM), new CharRange(0x0F1A, 0x0F1F, AL), new CharRange(0x0F20, 0x0F29, NU), new CharRange(0x0F2A, 0x0F33, AL), new CharRange(0x0F34, 0x0F34, BA), new CharRange(0x0F35, 0x0F35, CM), new CharRange(0x0F36, 0x0F36, AL), new CharRange(0x0F37, 0x0F37, CM), new CharRange(0x0F38, 0x0F38, AL), new CharRange(0x0F39, 0x0F39, CM), new CharRange(0x0F3A, 0x0F3A, OP), new CharRange(0x0F3B, 0x0F3B, CL), new CharRange(0x0F3C, 0x0F3C, OP), new CharRange(0x0F3D, 0x0F3D, CL), new CharRange(0x0F3E, 0x0F3F, CM), new CharRange(0x0F40, 0x0F6C, AL), new CharRange(0x0F71, 0x0F7E, CM), new CharRange(0x0F7F, 0x0F7F, BA), new CharRange(0x0F80, 0x0F84, CM), new CharRange(0x0F85, 0x0F85, BA), new CharRange(0x0F86, 0x0F87, CM), new CharRange(0x0F88, 0x0F8C, AL), new CharRange(0x0F8D, 0x0FBC, CM), new CharRange(0x0FBE, 0x0FBF, BA), new CharRange(0x0FC0, 0x0FC5, AL), new CharRange(0x0FC6, 0x0FC6, CM), new CharRange(0x0FC7, 0x0FCF, AL), new CharRange(0x0FD0, 0x0FD1, BB), new CharRange(0x0FD2, 0x0FD2, BA), new CharRange(0x0FD3, 0x0FD3, BB), new CharRange(0x0FD4, 0x0FD8, AL), new CharRange(0x0FD9, 0x0FDA, GL), new CharRange(0x1000, 0x103F, SA), new CharRange(0x1040, 0x1049, NU), new CharRange(0x104A, 0x104B, BA), new CharRange(0x104C, 0x104F, AL), new CharRange(0x1050, 0x108F, SA), new CharRange(0x1090, 0x1099, NU), new CharRange(0x109A, 0x109F, SA), new CharRange(0x10A0, 0x10FF, AL), new CharRange(0x1100, 0x115F, JL), new CharRange(0x1160, 0x11A7, JV), new CharRange(0x11A8, 0x11FF, JT), new CharRange(0x1200, 0x135A, AL), new CharRange(0x135D, 0x135F, CM), new CharRange(0x1360, 0x1360, AL), new CharRange(0x1361, 0x1361, BA), new CharRange(0x1362, 0x13F4, AL), new CharRange(0x1400, 0x1400, BA), new CharRange(0x1401, 0x167F, AL), new CharRange(0x1680, 0x1680, BA), new CharRange(0x1681, 0x169A, AL), new CharRange(0x169B, 0x169B, OP), new CharRange(0x169C, 0x169C, CL), new CharRange(0x16A0, 0x16EA, AL), new CharRange(0x16EB, 0x16ED, BA), new CharRange(0x16EE, 0x1711, AL), new CharRange(0x1712, 0x1714, CM), new CharRange(0x1720, 0x1731, AL), new CharRange(0x1732, 0x1734, CM), new CharRange(0x1735, 0x1736, BA), new CharRange(0x1740, 0x1751, AL), new CharRange(0x1752, 0x1753, CM), new CharRange(0x1760, 0x1770, AL), new CharRange(0x1772, 0x1773, CM), new CharRange(0x1780, 0x17D3, SA), new CharRange(0x17D4, 0x17D5, BA), new CharRange(0x17D6, 0x17D6, NS), new CharRange(0x17D7, 0x17D7, SA), new CharRange(0x17D8, 0x17D8, BA), new CharRange(0x17D9, 0x17D9, AL), new CharRange(0x17DA, 0x17DA, BA), new CharRange(0x17DB, 0x17DB, PR), new CharRange(0x17DC, 0x17DD, SA), new CharRange(0x17E0, 0x17E9, NU), new CharRange(0x17F0, 0x1801, AL), new CharRange(0x1802, 0x1803, EX), new CharRange(0x1804, 0x1805, BA), new CharRange(0x1806, 0x1806, BB), new CharRange(0x1807, 0x1807, AL), new CharRange(0x1808, 0x1809, EX), new CharRange(0x180A, 0x180A, AL), new CharRange(0x180B, 0x180D, CM), new CharRange(0x180E, 0x180E, GL), new CharRange(0x1810, 0x1819, NU), new CharRange(0x1820, 0x18A8, AL), new CharRange(0x18A9, 0x18A9, CM), new CharRange(0x18AA, 0x191C, AL), new CharRange(0x1920, 0x193B, CM), new CharRange(0x1940, 0x1940, AL), new CharRange(0x1944, 0x1945, EX), new CharRange(0x1946, 0x194F, NU), new CharRange(0x1950, 0x19C9, SA), new CharRange(0x19D0, 0x19D9, NU), new CharRange(0x19DA, 0x19DF, SA), new CharRange(0x19E0, 0x1A16, AL), new CharRange(0x1A17, 0x1A1B, CM), new CharRange(0x1A1E, 0x1A1F, AL), new CharRange(0x1A20, 0x1A7C, SA), new CharRange(0x1A7F, 0x1A7F, CM), new CharRange(0x1A80, 0x1A99, NU), new CharRange(0x1AA0, 0x1AAD, SA), new CharRange(0x1B00, 0x1B04, CM), new CharRange(0x1B05, 0x1B33, AL), new CharRange(0x1B34, 0x1B44, CM), new CharRange(0x1B45, 0x1B4B, AL), new CharRange(0x1B50, 0x1B59, NU), new CharRange(0x1B5A, 0x1B5B, BA), new CharRange(0x1B5C, 0x1B5C, AL), new CharRange(0x1B5D, 0x1B60, BA), new CharRange(0x1B61, 0x1B6A, AL), new CharRange(0x1B6B, 0x1B73, CM), new CharRange(0x1B74, 0x1B7C, AL), new CharRange(0x1B80, 0x1B82, CM), new CharRange(0x1B83, 0x1BA0, AL), new CharRange(0x1BA1, 0x1BAD, CM), new CharRange(0x1BAE, 0x1BAF, AL), new CharRange(0x1BB0, 0x1BB9, NU), new CharRange(0x1BBA, 0x1BE5, AL), new CharRange(0x1BE6, 0x1BF3, CM), new CharRange(0x1BFC, 0x1C23, AL), new CharRange(0x1C24, 0x1C37, CM), new CharRange(0x1C3B, 0x1C3F, BA), new CharRange(0x1C40, 0x1C49, NU), new CharRange(0x1C4D, 0x1C4F, AL), new CharRange(0x1C50, 0x1C59, NU), new CharRange(0x1C5A, 0x1C7D, AL), new CharRange(0x1C7E, 0x1C7F, BA), new CharRange(0x1CC0, 0x1CC7, AL), new CharRange(0x1CD0, 0x1CD2, CM), new CharRange(0x1CD3, 0x1CD3, AL), new CharRange(0x1CD4, 0x1CE8, CM), new CharRange(0x1CE9, 0x1CEC, AL), new CharRange(0x1CED, 0x1CED, CM), new CharRange(0x1CEE, 0x1CF1, AL), new CharRange(0x1CF2, 0x1CF4, CM), new CharRange(0x1CF5, 0x1DBF, AL), new CharRange(0x1DC0, 0x1DFF, CM), new CharRange(0x1E00, 0x1FFC, AL), new CharRange(0x1FFD, 0x1FFD, BB), new CharRange(0x1FFE, 0x1FFE, AL), new CharRange(0x2000, 0x2006, BA), new CharRange(0x2007, 0x2007, GL), new CharRange(0x2008, 0x200A, BA), new CharRange(0x200B, 0x200B, ZW), new CharRange(0x200C, 0x200F, CM), new CharRange(0x2010, 0x2010, BA), new CharRange(0x2011, 0x2011, GL), new CharRange(0x2012, 0x2013, BA), new CharRange(0x2014, 0x2014, B2), new CharRange(0x2015, 0x2016, AI), new CharRange(0x2017, 0x2017, AL), new CharRange(0x2018, 0x2019, QU), new CharRange(0x201A, 0x201A, OP), new CharRange(0x201B, 0x201D, QU), new CharRange(0x201E, 0x201E, OP), new CharRange(0x201F, 0x201F, QU), new CharRange(0x2020, 0x2021, AI), new CharRange(0x2022, 0x2023, AL), new CharRange(0x2024, 0x2026, IN), new CharRange(0x2027, 0x2027, BA), new CharRange(0x2028, 0x2029, BK), new CharRange(0x202A, 0x202E, CM), new CharRange(0x202F, 0x202F, GL), new CharRange(0x2030, 0x2037, PO), new CharRange(0x2038, 0x2038, AL), new CharRange(0x2039, 0x203A, QU), new CharRange(0x203B, 0x203B, AI), new CharRange(0x203C, 0x203D, NS), new CharRange(0x203E, 0x2043, AL), new CharRange(0x2044, 0x2044, IS), new CharRange(0x2045, 0x2045, OP), new CharRange(0x2046, 0x2046, CL), new CharRange(0x2047, 0x2049, NS), new CharRange(0x204A, 0x2055, AL), new CharRange(0x2056, 0x2056, BA), new CharRange(0x2057, 0x2057, AL), new CharRange(0x2058, 0x205B, BA), new CharRange(0x205C, 0x205C, AL), new CharRange(0x205D, 0x205F, BA), new CharRange(0x2060, 0x2060, WJ), new CharRange(0x2061, 0x2064, AL), new CharRange(0x206A, 0x206F, CM), new CharRange(0x2070, 0x2071, AL), new CharRange(0x2074, 0x2074, AI), new CharRange(0x2075, 0x207C, AL), new CharRange(0x207D, 0x207D, OP), new CharRange(0x207E, 0x207E, CL), new CharRange(0x207F, 0x207F, AI), new CharRange(0x2080, 0x2080, AL), new CharRange(0x2081, 0x2084, AI), new CharRange(0x2085, 0x208C, AL), new CharRange(0x208D, 0x208D, OP), new CharRange(0x208E, 0x208E, CL), new CharRange(0x2090, 0x209C, AL), new CharRange(0x20A0, 0x20A6, PR), new CharRange(0x20A7, 0x20A7, PO), new CharRange(0x20A8, 0x20B5, PR), new CharRange(0x20B6, 0x20B6, PO), new CharRange(0x20B7, 0x20BA, PR), new CharRange(0x20D0, 0x20F0, CM), new CharRange(0x2100, 0x2102, AL), new CharRange(0x2103, 0x2103, PO), new CharRange(0x2104, 0x2104, AL), new CharRange(0x2105, 0x2105, AI), new CharRange(0x2106, 0x2108, AL), new CharRange(0x2109, 0x2109, PO), new CharRange(0x210A, 0x2112, AL), new CharRange(0x2113, 0x2113, AI), new CharRange(0x2114, 0x2115, AL), new CharRange(0x2116, 0x2116, PR), new CharRange(0x2117, 0x2120, AL), new CharRange(0x2121, 0x2122, AI), new CharRange(0x2123, 0x212A, AL), new CharRange(0x212B, 0x212B, AI), new CharRange(0x212C, 0x2153, AL), new CharRange(0x2154, 0x2155, AI), new CharRange(0x2156, 0x215A, AL), new CharRange(0x215B, 0x215B, AI), new CharRange(0x215C, 0x215D, AL), new CharRange(0x215E, 0x215E, AI), new CharRange(0x215F, 0x215F, AL), new CharRange(0x2160, 0x216B, AI), new CharRange(0x216C, 0x216F, AL), new CharRange(0x2170, 0x2179, AI), new CharRange(0x217A, 0x2188, AL), new CharRange(0x2189, 0x2199, AI), new CharRange(0x219A, 0x21D1, AL), new CharRange(0x21D2, 0x21D2, AI), new CharRange(0x21D3, 0x21D3, AL), new CharRange(0x21D4, 0x21D4, AI), new CharRange(0x21D5, 0x21FF, AL), new CharRange(0x2200, 0x2200, AI), new CharRange(0x2201, 0x2201, AL), new CharRange(0x2202, 0x2203, AI), new CharRange(0x2204, 0x2206, AL), new CharRange(0x2207, 0x2208, AI), new CharRange(0x2209, 0x220A, AL), new CharRange(0x220B, 0x220B, AI), new CharRange(0x220C, 0x220E, AL), new CharRange(0x220F, 0x220F, AI), new CharRange(0x2210, 0x2210, AL), new CharRange(0x2211, 0x2211, AI), new CharRange(0x2212, 0x2213, PR), new CharRange(0x2214, 0x2214, AL), new CharRange(0x2215, 0x2215, AI), new CharRange(0x2216, 0x2219, AL), new CharRange(0x221A, 0x221A, AI), new CharRange(0x221B, 0x221C, AL), new CharRange(0x221D, 0x2220, AI), new CharRange(0x2221, 0x2222, AL), new CharRange(0x2223, 0x2223, AI), new CharRange(0x2224, 0x2224, AL), new CharRange(0x2225, 0x2225, AI), new CharRange(0x2226, 0x2226, AL), new CharRange(0x2227, 0x222C, AI), new CharRange(0x222D, 0x222D, AL), new CharRange(0x222E, 0x222E, AI), new CharRange(0x222F, 0x2233, AL), new CharRange(0x2234, 0x2237, AI), new CharRange(0x2238, 0x223B, AL), new CharRange(0x223C, 0x223D, AI), new CharRange(0x223E, 0x2247, AL), new CharRange(0x2248, 0x2248, AI), new CharRange(0x2249, 0x224B, AL), new CharRange(0x224C, 0x224C, AI), new CharRange(0x224D, 0x2251, AL), new CharRange(0x2252, 0x2252, AI), new CharRange(0x2253, 0x225F, AL), new CharRange(0x2260, 0x2261, AI), new CharRange(0x2262, 0x2263, AL), new CharRange(0x2264, 0x2267, AI), new CharRange(0x2268, 0x2269, AL), new CharRange(0x226A, 0x226B, AI), new CharRange(0x226C, 0x226D, AL), new CharRange(0x226E, 0x226F, AI), new CharRange(0x2270, 0x2281, AL), new CharRange(0x2282, 0x2283, AI), new CharRange(0x2284, 0x2285, AL), new CharRange(0x2286, 0x2287, AI), new CharRange(0x2288, 0x2294, AL), new CharRange(0x2295, 0x2295, AI), new CharRange(0x2296, 0x2298, AL), new CharRange(0x2299, 0x2299, AI), new CharRange(0x229A, 0x22A4, AL), new CharRange(0x22A5, 0x22A5, AI), new CharRange(0x22A6, 0x22BE, AL), new CharRange(0x22BF, 0x22BF, AI), new CharRange(0x22C0, 0x2311, AL), new CharRange(0x2312, 0x2312, AI), new CharRange(0x2313, 0x2319, AL), new CharRange(0x231A, 0x231B, ID), new CharRange(0x231C, 0x2328, AL), new CharRange(0x2329, 0x2329, OP), new CharRange(0x232A, 0x232A, CL), new CharRange(0x232B, 0x23EF, AL), new CharRange(0x23F0, 0x23F3, ID), new CharRange(0x2400, 0x244A, AL), new CharRange(0x2460, 0x24FE, AI), new CharRange(0x24FF, 0x24FF, AL), new CharRange(0x2500, 0x254B, AI), new CharRange(0x254C, 0x254F, AL), new CharRange(0x2550, 0x2574, AI), new CharRange(0x2575, 0x257F, AL), new CharRange(0x2580, 0x258F, AI), new CharRange(0x2590, 0x2591, AL), new CharRange(0x2592, 0x2595, AI), new CharRange(0x2596, 0x259F, AL), new CharRange(0x25A0, 0x25A1, AI), new CharRange(0x25A2, 0x25A2, AL), new CharRange(0x25A3, 0x25A9, AI), new CharRange(0x25AA, 0x25B1, AL), new CharRange(0x25B2, 0x25B3, AI), new CharRange(0x25B4, 0x25B5, AL), new CharRange(0x25B6, 0x25B7, AI), new CharRange(0x25B8, 0x25BB, AL), new CharRange(0x25BC, 0x25BD, AI), new CharRange(0x25BE, 0x25BF, AL), new CharRange(0x25C0, 0x25C1, AI), new CharRange(0x25C2, 0x25C5, AL), new CharRange(0x25C6, 0x25C8, AI), new CharRange(0x25C9, 0x25CA, AL), new CharRange(0x25CB, 0x25CB, AI), new CharRange(0x25CC, 0x25CD, AL), new CharRange(0x25CE, 0x25D1, AI), new CharRange(0x25D2, 0x25E1, AL), new CharRange(0x25E2, 0x25E5, AI), new CharRange(0x25E6, 0x25EE, AL), new CharRange(0x25EF, 0x25EF, AI), new CharRange(0x25F0, 0x25FF, AL), new CharRange(0x2600, 0x2603, ID), new CharRange(0x2604, 0x2604, AL), new CharRange(0x2605, 0x2606, AI), new CharRange(0x2607, 0x2608, AL), new CharRange(0x2609, 0x2609, AI), new CharRange(0x260A, 0x260D, AL), new CharRange(0x260E, 0x260F, AI), new CharRange(0x2610, 0x2613, AL), new CharRange(0x2614, 0x2615, ID), new CharRange(0x2616, 0x2617, AI), new CharRange(0x2618, 0x2618, ID), new CharRange(0x2619, 0x2619, AL), new CharRange(0x261A, 0x261F, ID), new CharRange(0x2620, 0x2638, AL), new CharRange(0x2639, 0x263B, ID), new CharRange(0x263C, 0x263F, AL), new CharRange(0x2640, 0x2640, AI), new CharRange(0x2641, 0x2641, AL), new CharRange(0x2642, 0x2642, AI), new CharRange(0x2643, 0x265F, AL), new CharRange(0x2660, 0x2661, AI), new CharRange(0x2662, 0x2662, AL), new CharRange(0x2663, 0x2665, AI), new CharRange(0x2666, 0x2666, AL), new CharRange(0x2667, 0x2667, AI), new CharRange(0x2668, 0x2668, ID), new CharRange(0x2669, 0x266A, AI), new CharRange(0x266B, 0x266B, AL), new CharRange(0x266C, 0x266D, AI), new CharRange(0x266E, 0x266E, AL), new CharRange(0x266F, 0x266F, AI), new CharRange(0x2670, 0x267E, AL), new CharRange(0x267F, 0x267F, ID), new CharRange(0x2680, 0x269D, AL), new CharRange(0x269E, 0x269F, AI), new CharRange(0x26A0, 0x26BC, AL), new CharRange(0x26BD, 0x26C8, ID), new CharRange(0x26C9, 0x26CC, AI), new CharRange(0x26CD, 0x26CD, ID), new CharRange(0x26CE, 0x26CE, AL), new CharRange(0x26CF, 0x26D1, ID), new CharRange(0x26D2, 0x26D2, AI), new CharRange(0x26D3, 0x26D4, ID), new CharRange(0x26D5, 0x26D7, AI), new CharRange(0x26D8, 0x26D9, ID), new CharRange(0x26DA, 0x26DB, AI), new CharRange(0x26DC, 0x26DC, ID), new CharRange(0x26DD, 0x26DE, AI), new CharRange(0x26DF, 0x26E1, ID), new CharRange(0x26E2, 0x26E2, AL), new CharRange(0x26E3, 0x26E3, AI), new CharRange(0x26E4, 0x26E7, AL), new CharRange(0x26E8, 0x26E9, AI), new CharRange(0x26EA, 0x26EA, ID), new CharRange(0x26EB, 0x26F0, AI), new CharRange(0x26F1, 0x26F5, ID), new CharRange(0x26F6, 0x26F6, AI), new CharRange(0x26F7, 0x26FA, ID), new CharRange(0x26FB, 0x26FC, AI), new CharRange(0x26FD, 0x2704, ID), new CharRange(0x2705, 0x2707, AL), new CharRange(0x2708, 0x270D, ID), new CharRange(0x270E, 0x2756, AL), new CharRange(0x2757, 0x2757, AI), new CharRange(0x2758, 0x275A, AL), new CharRange(0x275B, 0x275E, QU), new CharRange(0x275F, 0x2761, AL), new CharRange(0x2762, 0x2763, EX), new CharRange(0x2764, 0x2767, AL), new CharRange(0x2768, 0x2768, OP), new CharRange(0x2769, 0x2769, CL), new CharRange(0x276A, 0x276A, OP), new CharRange(0x276B, 0x276B, CL), new CharRange(0x276C, 0x276C, OP), new CharRange(0x276D, 0x276D, CL), new CharRange(0x276E, 0x276E, OP), new CharRange(0x276F, 0x276F, CL), new CharRange(0x2770, 0x2770, OP), new CharRange(0x2771, 0x2771, CL), new CharRange(0x2772, 0x2772, OP), new CharRange(0x2773, 0x2773, CL), new CharRange(0x2774, 0x2774, OP), new CharRange(0x2775, 0x2775, CL), new CharRange(0x2776, 0x2793, AI), new CharRange(0x2794, 0x27C4, AL), new CharRange(0x27C5, 0x27C5, OP), new CharRange(0x27C6, 0x27C6, CL), new CharRange(0x27C7, 0x27E5, AL), new CharRange(0x27E6, 0x27E6, OP), new CharRange(0x27E7, 0x27E7, CL), new CharRange(0x27E8, 0x27E8, OP), new CharRange(0x27E9, 0x27E9, CL), new CharRange(0x27EA, 0x27EA, OP), new CharRange(0x27EB, 0x27EB, CL), new CharRange(0x27EC, 0x27EC, OP), new CharRange(0x27ED, 0x27ED, CL), new CharRange(0x27EE, 0x27EE, OP), new CharRange(0x27EF, 0x27EF, CL), new CharRange(0x27F0, 0x2982, AL), new CharRange(0x2983, 0x2983, OP), new CharRange(0x2984, 0x2984, CL), new CharRange(0x2985, 0x2985, OP), new CharRange(0x2986, 0x2986, CL), new CharRange(0x2987, 0x2987, OP), new CharRange(0x2988, 0x2988, CL), new CharRange(0x2989, 0x2989, OP), new CharRange(0x298A, 0x298A, CL), new CharRange(0x298B, 0x298B, OP), new CharRange(0x298C, 0x298C, CL), new CharRange(0x298D, 0x298D, OP), new CharRange(0x298E, 0x298E, CL), new CharRange(0x298F, 0x298F, OP), new CharRange(0x2990, 0x2990, CL), new CharRange(0x2991, 0x2991, OP), new CharRange(0x2992, 0x2992, CL), new CharRange(0x2993, 0x2993, OP), new CharRange(0x2994, 0x2994, CL), new CharRange(0x2995, 0x2995, OP), new CharRange(0x2996, 0x2996, CL), new CharRange(0x2997, 0x2997, OP), new CharRange(0x2998, 0x2998, CL), new CharRange(0x2999, 0x29D7, AL), new CharRange(0x29D8, 0x29D8, OP), new CharRange(0x29D9, 0x29D9, CL), new CharRange(0x29DA, 0x29DA, OP), new CharRange(0x29DB, 0x29DB, CL), new CharRange(0x29DC, 0x29FB, AL), new CharRange(0x29FC, 0x29FC, OP), new CharRange(0x29FD, 0x29FD, CL), new CharRange(0x29FE, 0x2B54, AL), new CharRange(0x2B55, 0x2B59, AI), new CharRange(0x2C00, 0x2CEE, AL), new CharRange(0x2CEF, 0x2CF1, CM), new CharRange(0x2CF2, 0x2CF3, AL), new CharRange(0x2CF9, 0x2CF9, EX), new CharRange(0x2CFA, 0x2CFC, BA), new CharRange(0x2CFD, 0x2CFD, AL), new CharRange(0x2CFE, 0x2CFE, EX), new CharRange(0x2CFF, 0x2CFF, BA), new CharRange(0x2D00, 0x2D6F, AL), new CharRange(0x2D70, 0x2D70, BA), new CharRange(0x2D7F, 0x2D7F, CM), new CharRange(0x2D80, 0x2DDE, AL), new CharRange(0x2DE0, 0x2DFF, CM), new CharRange(0x2E00, 0x2E0D, QU), new CharRange(0x2E0E, 0x2E15, BA), new CharRange(0x2E16, 0x2E16, AL), new CharRange(0x2E17, 0x2E17, BA), new CharRange(0x2E18, 0x2E18, OP), new CharRange(0x2E19, 0x2E19, BA), new CharRange(0x2E1A, 0x2E1B, AL), new CharRange(0x2E1C, 0x2E1D, QU), new CharRange(0x2E1E, 0x2E1F, AL), new CharRange(0x2E20, 0x2E21, QU), new CharRange(0x2E22, 0x2E22, OP), new CharRange(0x2E23, 0x2E23, CL), new CharRange(0x2E24, 0x2E24, OP), new CharRange(0x2E25, 0x2E25, CL), new CharRange(0x2E26, 0x2E26, OP), new CharRange(0x2E27, 0x2E27, CL), new CharRange(0x2E28, 0x2E28, OP), new CharRange(0x2E29, 0x2E29, CL), new CharRange(0x2E2A, 0x2E2D, BA), new CharRange(0x2E2E, 0x2E2E, EX), new CharRange(0x2E2F, 0x2E2F, AL), new CharRange(0x2E30, 0x2E31, BA), new CharRange(0x2E32, 0x2E32, AL), new CharRange(0x2E33, 0x2E34, BA), new CharRange(0x2E35, 0x2E39, AL), new CharRange(0x2E3A, 0x2E3B, B2), new CharRange(0x2E80, 0x3000, ID), new CharRange(0x3001, 0x3002, CL), new CharRange(0x3003, 0x3004, ID), new CharRange(0x3005, 0x3005, NS), new CharRange(0x3006, 0x3007, ID), new CharRange(0x3008, 0x3008, OP), new CharRange(0x3009, 0x3009, CL), new CharRange(0x300A, 0x300A, OP), new CharRange(0x300B, 0x300B, CL), new CharRange(0x300C, 0x300C, OP), new CharRange(0x300D, 0x300D, CL), new CharRange(0x300E, 0x300E, OP), new CharRange(0x300F, 0x300F, CL), new CharRange(0x3010, 0x3010, OP), new CharRange(0x3011, 0x3011, CL), new CharRange(0x3012, 0x3013, ID), new CharRange(0x3014, 0x3014, OP), new CharRange(0x3015, 0x3015, CL), new CharRange(0x3016, 0x3016, OP), new CharRange(0x3017, 0x3017, CL), new CharRange(0x3018, 0x3018, OP), new CharRange(0x3019, 0x3019, CL), new CharRange(0x301A, 0x301A, OP), new CharRange(0x301B, 0x301B, CL), new CharRange(0x301C, 0x301C, NS), new CharRange(0x301D, 0x301D, OP), new CharRange(0x301E, 0x301F, CL), new CharRange(0x3020, 0x3029, ID), new CharRange(0x302A, 0x302F, CM), new CharRange(0x3030, 0x303A, ID), new CharRange(0x303B, 0x303C, NS), new CharRange(0x303D, 0x303F, ID), new CharRange(0x3041, 0x3041, CJ), new CharRange(0x3042, 0x3042, ID), new CharRange(0x3043, 0x3043, CJ), new CharRange(0x3044, 0x3044, ID), new CharRange(0x3045, 0x3045, CJ), new CharRange(0x3046, 0x3046, ID), new CharRange(0x3047, 0x3047, CJ), new CharRange(0x3048, 0x3048, ID), new CharRange(0x3049, 0x3049, CJ), new CharRange(0x304A, 0x3062, ID), new CharRange(0x3063, 0x3063, CJ), new CharRange(0x3064, 0x3082, ID), new CharRange(0x3083, 0x3083, CJ), new CharRange(0x3084, 0x3084, ID), new CharRange(0x3085, 0x3085, CJ), new CharRange(0x3086, 0x3086, ID), new CharRange(0x3087, 0x3087, CJ), new CharRange(0x3088, 0x308D, ID), new CharRange(0x308E, 0x308E, CJ), new CharRange(0x308F, 0x3094, ID), new CharRange(0x3095, 0x3096, CJ), new CharRange(0x3099, 0x309A, CM), new CharRange(0x309B, 0x309E, NS), new CharRange(0x309F, 0x309F, ID), new CharRange(0x30A0, 0x30A0, NS), new CharRange(0x30A1, 0x30A1, CJ), new CharRange(0x30A2, 0x30A2, ID), new CharRange(0x30A3, 0x30A3, CJ), new CharRange(0x30A4, 0x30A4, ID), new CharRange(0x30A5, 0x30A5, CJ), new CharRange(0x30A6, 0x30A6, ID), new CharRange(0x30A7, 0x30A7, CJ), new CharRange(0x30A8, 0x30A8, ID), new CharRange(0x30A9, 0x30A9, CJ), new CharRange(0x30AA, 0x30C2, ID), new CharRange(0x30C3, 0x30C3, CJ), new CharRange(0x30C4, 0x30E2, ID), new CharRange(0x30E3, 0x30E3, CJ), new CharRange(0x30E4, 0x30E4, ID), new CharRange(0x30E5, 0x30E5, CJ), new CharRange(0x30E6, 0x30E6, ID), new CharRange(0x30E7, 0x30E7, CJ), new CharRange(0x30E8, 0x30ED, ID), new CharRange(0x30EE, 0x30EE, CJ), new CharRange(0x30EF, 0x30F4, ID), new CharRange(0x30F5, 0x30F6, CJ), new CharRange(0x30F7, 0x30FA, ID), new CharRange(0x30FB, 0x30FB, NS), new CharRange(0x30FC, 0x30FC, CJ), new CharRange(0x30FD, 0x30FE, NS), new CharRange(0x30FF, 0x31E3, ID), new CharRange(0x31F0, 0x31FF, CJ), new CharRange(0x3200, 0x3247, ID), new CharRange(0x3248, 0x324F, AI), new CharRange(0x3250, 0x4DBF, ID), new CharRange(0x4DC0, 0x4DFF, AL), new CharRange(0x4E00, 0xA014, ID), new CharRange(0xA015, 0xA015, NS), new CharRange(0xA016, 0xA4C6, ID), new CharRange(0xA4D0, 0xA4FD, AL), new CharRange(0xA4FE, 0xA4FF, BA), new CharRange(0xA500, 0xA60C, AL), new CharRange(0xA60D, 0xA60D, BA), new CharRange(0xA60E, 0xA60E, EX), new CharRange(0xA60F, 0xA60F, BA), new CharRange(0xA610, 0xA61F, AL), new CharRange(0xA620, 0xA629, NU), new CharRange(0xA62A, 0xA66E, AL), new CharRange(0xA66F, 0xA672, CM), new CharRange(0xA673, 0xA673, AL), new CharRange(0xA674, 0xA67D, CM), new CharRange(0xA67E, 0xA697, AL), new CharRange(0xA69F, 0xA69F, CM), new CharRange(0xA6A0, 0xA6EF, AL), new CharRange(0xA6F0, 0xA6F1, CM), new CharRange(0xA6F2, 0xA6F2, AL), new CharRange(0xA6F3, 0xA6F7, BA), new CharRange(0xA700, 0xA801, AL), new CharRange(0xA802, 0xA802, CM), new CharRange(0xA803, 0xA805, AL), new CharRange(0xA806, 0xA806, CM), new CharRange(0xA807, 0xA80A, AL), new CharRange(0xA80B, 0xA80B, CM), new CharRange(0xA80C, 0xA822, AL), new CharRange(0xA823, 0xA827, CM), new CharRange(0xA828, 0xA837, AL), new CharRange(0xA838, 0xA838, PO), new CharRange(0xA839, 0xA873, AL), new CharRange(0xA874, 0xA875, BB), new CharRange(0xA876, 0xA877, EX), new CharRange(0xA880, 0xA881, CM), new CharRange(0xA882, 0xA8B3, AL), new CharRange(0xA8B4, 0xA8C4, CM), new CharRange(0xA8CE, 0xA8CF, BA), new CharRange(0xA8D0, 0xA8D9, NU), new CharRange(0xA8E0, 0xA8F1, CM), new CharRange(0xA8F2, 0xA8FB, AL), new CharRange(0xA900, 0xA909, NU), new CharRange(0xA90A, 0xA925, AL), new CharRange(0xA926, 0xA92D, CM), new CharRange(0xA92E, 0xA92F, BA), new CharRange(0xA930, 0xA946, AL), new CharRange(0xA947, 0xA953, CM), new CharRange(0xA95F, 0xA95F, AL), new CharRange(0xA960, 0xA97C, JL), new CharRange(0xA980, 0xA983, CM), new CharRange(0xA984, 0xA9B2, AL), new CharRange(0xA9B3, 0xA9C0, CM), new CharRange(0xA9C1, 0xA9C6, AL), new CharRange(0xA9C7, 0xA9C9, BA), new CharRange(0xA9CA, 0xA9CF, AL), new CharRange(0xA9D0, 0xA9D9, NU), new CharRange(0xA9DE, 0xAA28, AL), new CharRange(0xAA29, 0xAA36, CM), new CharRange(0xAA40, 0xAA42, AL), new CharRange(0xAA43, 0xAA43, CM), new CharRange(0xAA44, 0xAA4B, AL), new CharRange(0xAA4C, 0xAA4D, CM), new CharRange(0xAA50, 0xAA59, NU), new CharRange(0xAA5C, 0xAA5C, AL), new CharRange(0xAA5D, 0xAA5F, BA), new CharRange(0xAA60, 0xAADF, SA), new CharRange(0xAAE0, 0xAAEA, AL), new CharRange(0xAAEB, 0xAAEF, CM), new CharRange(0xAAF0, 0xAAF1, BA), new CharRange(0xAAF2, 0xAAF4, AL), new CharRange(0xAAF5, 0xAAF6, CM), new CharRange(0xAB01, 0xABE2, AL), new CharRange(0xABE3, 0xABEA, CM), new CharRange(0xABEB, 0xABEB, BA), new CharRange(0xABEC, 0xABED, CM), new CharRange(0xABF0, 0xABF9, NU), new CharRange(0xAC00, 0xAC00, H2), new CharRange(0xAC01, 0xAC1B, H3), new CharRange(0xAC1C, 0xAC1C, H2), new CharRange(0xAC1D, 0xAC37, H3), new CharRange(0xAC38, 0xAC38, H2), new CharRange(0xAC39, 0xAC53, H3), new CharRange(0xAC54, 0xAC54, H2), new CharRange(0xAC55, 0xAC6F, H3), new CharRange(0xAC70, 0xAC70, H2), new CharRange(0xAC71, 0xAC8B, H3), new CharRange(0xAC8C, 0xAC8C, H2), new CharRange(0xAC8D, 0xACA7, H3), new CharRange(0xACA8, 0xACA8, H2), new CharRange(0xACA9, 0xACC3, H3), new CharRange(0xACC4, 0xACC4, H2), new CharRange(0xACC5, 0xACDF, H3), new CharRange(0xACE0, 0xACE0, H2), new CharRange(0xACE1, 0xACFB, H3), new CharRange(0xACFC, 0xACFC, H2), new CharRange(0xACFD, 0xAD17, H3), new CharRange(0xAD18, 0xAD18, H2), new CharRange(0xAD19, 0xAD33, H3), new CharRange(0xAD34, 0xAD34, H2), new CharRange(0xAD35, 0xAD4F, H3), new CharRange(0xAD50, 0xAD50, H2), new CharRange(0xAD51, 0xAD6B, H3), new CharRange(0xAD6C, 0xAD6C, H2), new CharRange(0xAD6D, 0xAD87, H3), new CharRange(0xAD88, 0xAD88, H2), new CharRange(0xAD89, 0xADA3, H3), new CharRange(0xADA4, 0xADA4, H2), new CharRange(0xADA5, 0xADBF, H3), new CharRange(0xADC0, 0xADC0, H2), new CharRange(0xADC1, 0xADDB, H3), new CharRange(0xADDC, 0xADDC, H2), new CharRange(0xADDD, 0xADF7, H3), new CharRange(0xADF8, 0xADF8, H2), new CharRange(0xADF9, 0xAE13, H3), new CharRange(0xAE14, 0xAE14, H2), new CharRange(0xAE15, 0xAE2F, H3), new CharRange(0xAE30, 0xAE30, H2), new CharRange(0xAE31, 0xAE4B, H3), new CharRange(0xAE4C, 0xAE4C, H2), new CharRange(0xAE4D, 0xAE67, H3), new CharRange(0xAE68, 0xAE68, H2), new CharRange(0xAE69, 0xAE83, H3), new CharRange(0xAE84, 0xAE84, H2), new CharRange(0xAE85, 0xAE9F, H3), new CharRange(0xAEA0, 0xAEA0, H2), new CharRange(0xAEA1, 0xAEBB, H3), new CharRange(0xAEBC, 0xAEBC, H2), new CharRange(0xAEBD, 0xAED7, H3), new CharRange(0xAED8, 0xAED8, H2), new CharRange(0xAED9, 0xAEF3, H3), new CharRange(0xAEF4, 0xAEF4, H2), new CharRange(0xAEF5, 0xAF0F, H3), new CharRange(0xAF10, 0xAF10, H2), new CharRange(0xAF11, 0xAF2B, H3), new CharRange(0xAF2C, 0xAF2C, H2), new CharRange(0xAF2D, 0xAF47, H3), new CharRange(0xAF48, 0xAF48, H2), new CharRange(0xAF49, 0xAF63, H3), new CharRange(0xAF64, 0xAF64, H2), new CharRange(0xAF65, 0xAF7F, H3), new CharRange(0xAF80, 0xAF80, H2), new CharRange(0xAF81, 0xAF9B, H3), new CharRange(0xAF9C, 0xAF9C, H2), new CharRange(0xAF9D, 0xAFB7, H3), new CharRange(0xAFB8, 0xAFB8, H2), new CharRange(0xAFB9, 0xAFD3, H3), new CharRange(0xAFD4, 0xAFD4, H2), new CharRange(0xAFD5, 0xAFEF, H3), new CharRange(0xAFF0, 0xAFF0, H2), new CharRange(0xAFF1, 0xB00B, H3), new CharRange(0xB00C, 0xB00C, H2), new CharRange(0xB00D, 0xB027, H3), new CharRange(0xB028, 0xB028, H2), new CharRange(0xB029, 0xB043, H3), new CharRange(0xB044, 0xB044, H2), new CharRange(0xB045, 0xB05F, H3), new CharRange(0xB060, 0xB060, H2), new CharRange(0xB061, 0xB07B, H3), new CharRange(0xB07C, 0xB07C, H2), new CharRange(0xB07D, 0xB097, H3), new CharRange(0xB098, 0xB098, H2), new CharRange(0xB099, 0xB0B3, H3), new CharRange(0xB0B4, 0xB0B4, H2), new CharRange(0xB0B5, 0xB0CF, H3), new CharRange(0xB0D0, 0xB0D0, H2), new CharRange(0xB0D1, 0xB0EB, H3), new CharRange(0xB0EC, 0xB0EC, H2), new CharRange(0xB0ED, 0xB107, H3), new CharRange(0xB108, 0xB108, H2), new CharRange(0xB109, 0xB123, H3), new CharRange(0xB124, 0xB124, H2), new CharRange(0xB125, 0xB13F, H3), new CharRange(0xB140, 0xB140, H2), new CharRange(0xB141, 0xB15B, H3), new CharRange(0xB15C, 0xB15C, H2), new CharRange(0xB15D, 0xB177, H3), new CharRange(0xB178, 0xB178, H2), new CharRange(0xB179, 0xB193, H3), new CharRange(0xB194, 0xB194, H2), new CharRange(0xB195, 0xB1AF, H3), new CharRange(0xB1B0, 0xB1B0, H2), new CharRange(0xB1B1, 0xB1CB, H3), new CharRange(0xB1CC, 0xB1CC, H2), new CharRange(0xB1CD, 0xB1E7, H3), new CharRange(0xB1E8, 0xB1E8, H2), new CharRange(0xB1E9, 0xB203, H3), new CharRange(0xB204, 0xB204, H2), new CharRange(0xB205, 0xB21F, H3), new CharRange(0xB220, 0xB220, H2), new CharRange(0xB221, 0xB23B, H3), new CharRange(0xB23C, 0xB23C, H2), new CharRange(0xB23D, 0xB257, H3), new CharRange(0xB258, 0xB258, H2), new CharRange(0xB259, 0xB273, H3), new CharRange(0xB274, 0xB274, H2), new CharRange(0xB275, 0xB28F, H3), new CharRange(0xB290, 0xB290, H2), new CharRange(0xB291, 0xB2AB, H3), new CharRange(0xB2AC, 0xB2AC, H2), new CharRange(0xB2AD, 0xB2C7, H3), new CharRange(0xB2C8, 0xB2C8, H2), new CharRange(0xB2C9, 0xB2E3, H3), new CharRange(0xB2E4, 0xB2E4, H2), new CharRange(0xB2E5, 0xB2FF, H3), new CharRange(0xB300, 0xB300, H2), new CharRange(0xB301, 0xB31B, H3), new CharRange(0xB31C, 0xB31C, H2), new CharRange(0xB31D, 0xB337, H3), new CharRange(0xB338, 0xB338, H2), new CharRange(0xB339, 0xB353, H3), new CharRange(0xB354, 0xB354, H2), new CharRange(0xB355, 0xB36F, H3), new CharRange(0xB370, 0xB370, H2), new CharRange(0xB371, 0xB38B, H3), new CharRange(0xB38C, 0xB38C, H2), new CharRange(0xB38D, 0xB3A7, H3), new CharRange(0xB3A8, 0xB3A8, H2), new CharRange(0xB3A9, 0xB3C3, H3), new CharRange(0xB3C4, 0xB3C4, H2), new CharRange(0xB3C5, 0xB3DF, H3), new CharRange(0xB3E0, 0xB3E0, H2), new CharRange(0xB3E1, 0xB3FB, H3), new CharRange(0xB3FC, 0xB3FC, H2), new CharRange(0xB3FD, 0xB417, H3), new CharRange(0xB418, 0xB418, H2), new CharRange(0xB419, 0xB433, H3), new CharRange(0xB434, 0xB434, H2), new CharRange(0xB435, 0xB44F, H3), new CharRange(0xB450, 0xB450, H2), new CharRange(0xB451, 0xB46B, H3), new CharRange(0xB46C, 0xB46C, H2), new CharRange(0xB46D, 0xB487, H3), new CharRange(0xB488, 0xB488, H2), new CharRange(0xB489, 0xB4A3, H3), new CharRange(0xB4A4, 0xB4A4, H2), new CharRange(0xB4A5, 0xB4BF, H3), new CharRange(0xB4C0, 0xB4C0, H2), new CharRange(0xB4C1, 0xB4DB, H3), new CharRange(0xB4DC, 0xB4DC, H2), new CharRange(0xB4DD, 0xB4F7, H3), new CharRange(0xB4F8, 0xB4F8, H2), new CharRange(0xB4F9, 0xB513, H3), new CharRange(0xB514, 0xB514, H2), new CharRange(0xB515, 0xB52F, H3), new CharRange(0xB530, 0xB530, H2), new CharRange(0xB531, 0xB54B, H3), new CharRange(0xB54C, 0xB54C, H2), new CharRange(0xB54D, 0xB567, H3), new CharRange(0xB568, 0xB568, H2), new CharRange(0xB569, 0xB583, H3), new CharRange(0xB584, 0xB584, H2), new CharRange(0xB585, 0xB59F, H3), new CharRange(0xB5A0, 0xB5A0, H2), new CharRange(0xB5A1, 0xB5BB, H3), new CharRange(0xB5BC, 0xB5BC, H2), new CharRange(0xB5BD, 0xB5D7, H3), new CharRange(0xB5D8, 0xB5D8, H2), new CharRange(0xB5D9, 0xB5F3, H3), new CharRange(0xB5F4, 0xB5F4, H2), new CharRange(0xB5F5, 0xB60F, H3), new CharRange(0xB610, 0xB610, H2), new CharRange(0xB611, 0xB62B, H3), new CharRange(0xB62C, 0xB62C, H2), new CharRange(0xB62D, 0xB647, H3), new CharRange(0xB648, 0xB648, H2), new CharRange(0xB649, 0xB663, H3), new CharRange(0xB664, 0xB664, H2), new CharRange(0xB665, 0xB67F, H3), new CharRange(0xB680, 0xB680, H2), new CharRange(0xB681, 0xB69B, H3), new CharRange(0xB69C, 0xB69C, H2), new CharRange(0xB69D, 0xB6B7, H3), new CharRange(0xB6B8, 0xB6B8, H2), new CharRange(0xB6B9, 0xB6D3, H3), new CharRange(0xB6D4, 0xB6D4, H2), new CharRange(0xB6D5, 0xB6EF, H3), new CharRange(0xB6F0, 0xB6F0, H2), new CharRange(0xB6F1, 0xB70B, H3), new CharRange(0xB70C, 0xB70C, H2), new CharRange(0xB70D, 0xB727, H3), new CharRange(0xB728, 0xB728, H2), new CharRange(0xB729, 0xB743, H3), new CharRange(0xB744, 0xB744, H2), new CharRange(0xB745, 0xB75F, H3), new CharRange(0xB760, 0xB760, H2), new CharRange(0xB761, 0xB77B, H3), new CharRange(0xB77C, 0xB77C, H2), new CharRange(0xB77D, 0xB797, H3), new CharRange(0xB798, 0xB798, H2), new CharRange(0xB799, 0xB7B3, H3), new CharRange(0xB7B4, 0xB7B4, H2), new CharRange(0xB7B5, 0xB7CF, H3), new CharRange(0xB7D0, 0xB7D0, H2), new CharRange(0xB7D1, 0xB7EB, H3), new CharRange(0xB7EC, 0xB7EC, H2), new CharRange(0xB7ED, 0xB807, H3), new CharRange(0xB808, 0xB808, H2), new CharRange(0xB809, 0xB823, H3), new CharRange(0xB824, 0xB824, H2), new CharRange(0xB825, 0xB83F, H3), new CharRange(0xB840, 0xB840, H2), new CharRange(0xB841, 0xB85B, H3), new CharRange(0xB85C, 0xB85C, H2), new CharRange(0xB85D, 0xB877, H3), new CharRange(0xB878, 0xB878, H2), new CharRange(0xB879, 0xB893, H3), new CharRange(0xB894, 0xB894, H2), new CharRange(0xB895, 0xB8AF, H3), new CharRange(0xB8B0, 0xB8B0, H2), new CharRange(0xB8B1, 0xB8CB, H3), new CharRange(0xB8CC, 0xB8CC, H2), new CharRange(0xB8CD, 0xB8E7, H3), new CharRange(0xB8E8, 0xB8E8, H2), new CharRange(0xB8E9, 0xB903, H3), new CharRange(0xB904, 0xB904, H2), new CharRange(0xB905, 0xB91F, H3), new CharRange(0xB920, 0xB920, H2), new CharRange(0xB921, 0xB93B, H3), new CharRange(0xB93C, 0xB93C, H2), new CharRange(0xB93D, 0xB957, H3), new CharRange(0xB958, 0xB958, H2), new CharRange(0xB959, 0xB973, H3), new CharRange(0xB974, 0xB974, H2), new CharRange(0xB975, 0xB98F, H3), new CharRange(0xB990, 0xB990, H2), new CharRange(0xB991, 0xB9AB, H3), new CharRange(0xB9AC, 0xB9AC, H2), new CharRange(0xB9AD, 0xB9C7, H3), new CharRange(0xB9C8, 0xB9C8, H2), new CharRange(0xB9C9, 0xB9E3, H3), new CharRange(0xB9E4, 0xB9E4, H2), new CharRange(0xB9E5, 0xB9FF, H3), new CharRange(0xBA00, 0xBA00, H2), new CharRange(0xBA01, 0xBA1B, H3), new CharRange(0xBA1C, 0xBA1C, H2), new CharRange(0xBA1D, 0xBA37, H3), new CharRange(0xBA38, 0xBA38, H2), new CharRange(0xBA39, 0xBA53, H3), new CharRange(0xBA54, 0xBA54, H2), new CharRange(0xBA55, 0xBA6F, H3), new CharRange(0xBA70, 0xBA70, H2), new CharRange(0xBA71, 0xBA8B, H3), new CharRange(0xBA8C, 0xBA8C, H2), new CharRange(0xBA8D, 0xBAA7, H3), new CharRange(0xBAA8, 0xBAA8, H2), new CharRange(0xBAA9, 0xBAC3, H3), new CharRange(0xBAC4, 0xBAC4, H2), new CharRange(0xBAC5, 0xBADF, H3), new CharRange(0xBAE0, 0xBAE0, H2), new CharRange(0xBAE1, 0xBAFB, H3), new CharRange(0xBAFC, 0xBAFC, H2), new CharRange(0xBAFD, 0xBB17, H3), new CharRange(0xBB18, 0xBB18, H2), new CharRange(0xBB19, 0xBB33, H3), new CharRange(0xBB34, 0xBB34, H2), new CharRange(0xBB35, 0xBB4F, H3), new CharRange(0xBB50, 0xBB50, H2), new CharRange(0xBB51, 0xBB6B, H3), new CharRange(0xBB6C, 0xBB6C, H2), new CharRange(0xBB6D, 0xBB87, H3), new CharRange(0xBB88, 0xBB88, H2), new CharRange(0xBB89, 0xBBA3, H3), new CharRange(0xBBA4, 0xBBA4, H2), new CharRange(0xBBA5, 0xBBBF, H3), new CharRange(0xBBC0, 0xBBC0, H2), new CharRange(0xBBC1, 0xBBDB, H3), new CharRange(0xBBDC, 0xBBDC, H2), new CharRange(0xBBDD, 0xBBF7, H3), new CharRange(0xBBF8, 0xBBF8, H2), new CharRange(0xBBF9, 0xBC13, H3), new CharRange(0xBC14, 0xBC14, H2), new CharRange(0xBC15, 0xBC2F, H3), new CharRange(0xBC30, 0xBC30, H2), new CharRange(0xBC31, 0xBC4B, H3), new CharRange(0xBC4C, 0xBC4C, H2), new CharRange(0xBC4D, 0xBC67, H3), new CharRange(0xBC68, 0xBC68, H2), new CharRange(0xBC69, 0xBC83, H3), new CharRange(0xBC84, 0xBC84, H2), new CharRange(0xBC85, 0xBC9F, H3), new CharRange(0xBCA0, 0xBCA0, H2), new CharRange(0xBCA1, 0xBCBB, H3), new CharRange(0xBCBC, 0xBCBC, H2), new CharRange(0xBCBD, 0xBCD7, H3), new CharRange(0xBCD8, 0xBCD8, H2), new CharRange(0xBCD9, 0xBCF3, H3), new CharRange(0xBCF4, 0xBCF4, H2), new CharRange(0xBCF5, 0xBD0F, H3), new CharRange(0xBD10, 0xBD10, H2), new CharRange(0xBD11, 0xBD2B, H3), new CharRange(0xBD2C, 0xBD2C, H2), new CharRange(0xBD2D, 0xBD47, H3), new CharRange(0xBD48, 0xBD48, H2), new CharRange(0xBD49, 0xBD63, H3), new CharRange(0xBD64, 0xBD64, H2), new CharRange(0xBD65, 0xBD7F, H3), new CharRange(0xBD80, 0xBD80, H2), new CharRange(0xBD81, 0xBD9B, H3), new CharRange(0xBD9C, 0xBD9C, H2), new CharRange(0xBD9D, 0xBDB7, H3), new CharRange(0xBDB8, 0xBDB8, H2), new CharRange(0xBDB9, 0xBDD3, H3), new CharRange(0xBDD4, 0xBDD4, H2), new CharRange(0xBDD5, 0xBDEF, H3), new CharRange(0xBDF0, 0xBDF0, H2), new CharRange(0xBDF1, 0xBE0B, H3), new CharRange(0xBE0C, 0xBE0C, H2), new CharRange(0xBE0D, 0xBE27, H3), new CharRange(0xBE28, 0xBE28, H2), new CharRange(0xBE29, 0xBE43, H3), new CharRange(0xBE44, 0xBE44, H2), new CharRange(0xBE45, 0xBE5F, H3), new CharRange(0xBE60, 0xBE60, H2), new CharRange(0xBE61, 0xBE7B, H3), new CharRange(0xBE7C, 0xBE7C, H2), new CharRange(0xBE7D, 0xBE97, H3), new CharRange(0xBE98, 0xBE98, H2), new CharRange(0xBE99, 0xBEB3, H3), new CharRange(0xBEB4, 0xBEB4, H2), new CharRange(0xBEB5, 0xBECF, H3), new CharRange(0xBED0, 0xBED0, H2), new CharRange(0xBED1, 0xBEEB, H3), new CharRange(0xBEEC, 0xBEEC, H2), new CharRange(0xBEED, 0xBF07, H3), new CharRange(0xBF08, 0xBF08, H2), new CharRange(0xBF09, 0xBF23, H3), new CharRange(0xBF24, 0xBF24, H2), new CharRange(0xBF25, 0xBF3F, H3), new CharRange(0xBF40, 0xBF40, H2), new CharRange(0xBF41, 0xBF5B, H3), new CharRange(0xBF5C, 0xBF5C, H2), new CharRange(0xBF5D, 0xBF77, H3), new CharRange(0xBF78, 0xBF78, H2), new CharRange(0xBF79, 0xBF93, H3), new CharRange(0xBF94, 0xBF94, H2), new CharRange(0xBF95, 0xBFAF, H3), new CharRange(0xBFB0, 0xBFB0, H2), new CharRange(0xBFB1, 0xBFCB, H3), new CharRange(0xBFCC, 0xBFCC, H2), new CharRange(0xBFCD, 0xBFE7, H3), new CharRange(0xBFE8, 0xBFE8, H2), new CharRange(0xBFE9, 0xC003, H3), new CharRange(0xC004, 0xC004, H2), new CharRange(0xC005, 0xC01F, H3), new CharRange(0xC020, 0xC020, H2), new CharRange(0xC021, 0xC03B, H3), new CharRange(0xC03C, 0xC03C, H2), new CharRange(0xC03D, 0xC057, H3), new CharRange(0xC058, 0xC058, H2), new CharRange(0xC059, 0xC073, H3), new CharRange(0xC074, 0xC074, H2), new CharRange(0xC075, 0xC08F, H3), new CharRange(0xC090, 0xC090, H2), new CharRange(0xC091, 0xC0AB, H3), new CharRange(0xC0AC, 0xC0AC, H2), new CharRange(0xC0AD, 0xC0C7, H3), new CharRange(0xC0C8, 0xC0C8, H2), new CharRange(0xC0C9, 0xC0E3, H3), new CharRange(0xC0E4, 0xC0E4, H2), new CharRange(0xC0E5, 0xC0FF, H3), new CharRange(0xC100, 0xC100, H2), new CharRange(0xC101, 0xC11B, H3), new CharRange(0xC11C, 0xC11C, H2), new CharRange(0xC11D, 0xC137, H3), new CharRange(0xC138, 0xC138, H2), new CharRange(0xC139, 0xC153, H3), new CharRange(0xC154, 0xC154, H2), new CharRange(0xC155, 0xC16F, H3), new CharRange(0xC170, 0xC170, H2), new CharRange(0xC171, 0xC18B, H3), new CharRange(0xC18C, 0xC18C, H2), new CharRange(0xC18D, 0xC1A7, H3), new CharRange(0xC1A8, 0xC1A8, H2), new CharRange(0xC1A9, 0xC1C3, H3), new CharRange(0xC1C4, 0xC1C4, H2), new CharRange(0xC1C5, 0xC1DF, H3), new CharRange(0xC1E0, 0xC1E0, H2), new CharRange(0xC1E1, 0xC1FB, H3), new CharRange(0xC1FC, 0xC1FC, H2), new CharRange(0xC1FD, 0xC217, H3), new CharRange(0xC218, 0xC218, H2), new CharRange(0xC219, 0xC233, H3), new CharRange(0xC234, 0xC234, H2), new CharRange(0xC235, 0xC24F, H3), new CharRange(0xC250, 0xC250, H2), new CharRange(0xC251, 0xC26B, H3), new CharRange(0xC26C, 0xC26C, H2), new CharRange(0xC26D, 0xC287, H3), new CharRange(0xC288, 0xC288, H2), new CharRange(0xC289, 0xC2A3, H3), new CharRange(0xC2A4, 0xC2A4, H2), new CharRange(0xC2A5, 0xC2BF, H3), new CharRange(0xC2C0, 0xC2C0, H2), new CharRange(0xC2C1, 0xC2DB, H3), new CharRange(0xC2DC, 0xC2DC, H2), new CharRange(0xC2DD, 0xC2F7, H3), new CharRange(0xC2F8, 0xC2F8, H2), new CharRange(0xC2F9, 0xC313, H3), new CharRange(0xC314, 0xC314, H2), new CharRange(0xC315, 0xC32F, H3), new CharRange(0xC330, 0xC330, H2), new CharRange(0xC331, 0xC34B, H3), new CharRange(0xC34C, 0xC34C, H2), new CharRange(0xC34D, 0xC367, H3), new CharRange(0xC368, 0xC368, H2), new CharRange(0xC369, 0xC383, H3), new CharRange(0xC384, 0xC384, H2), new CharRange(0xC385, 0xC39F, H3), new CharRange(0xC3A0, 0xC3A0, H2), new CharRange(0xC3A1, 0xC3BB, H3), new CharRange(0xC3BC, 0xC3BC, H2), new CharRange(0xC3BD, 0xC3D7, H3), new CharRange(0xC3D8, 0xC3D8, H2), new CharRange(0xC3D9, 0xC3F3, H3), new CharRange(0xC3F4, 0xC3F4, H2), new CharRange(0xC3F5, 0xC40F, H3), new CharRange(0xC410, 0xC410, H2), new CharRange(0xC411, 0xC42B, H3), new CharRange(0xC42C, 0xC42C, H2), new CharRange(0xC42D, 0xC447, H3), new CharRange(0xC448, 0xC448, H2), new CharRange(0xC449, 0xC463, H3), new CharRange(0xC464, 0xC464, H2), new CharRange(0xC465, 0xC47F, H3), new CharRange(0xC480, 0xC480, H2), new CharRange(0xC481, 0xC49B, H3), new CharRange(0xC49C, 0xC49C, H2), new CharRange(0xC49D, 0xC4B7, H3), new CharRange(0xC4B8, 0xC4B8, H2), new CharRange(0xC4B9, 0xC4D3, H3), new CharRange(0xC4D4, 0xC4D4, H2), new CharRange(0xC4D5, 0xC4EF, H3), new CharRange(0xC4F0, 0xC4F0, H2), new CharRange(0xC4F1, 0xC50B, H3), new CharRange(0xC50C, 0xC50C, H2), new CharRange(0xC50D, 0xC527, H3), new CharRange(0xC528, 0xC528, H2), new CharRange(0xC529, 0xC543, H3), new CharRange(0xC544, 0xC544, H2), new CharRange(0xC545, 0xC55F, H3), new CharRange(0xC560, 0xC560, H2), new CharRange(0xC561, 0xC57B, H3), new CharRange(0xC57C, 0xC57C, H2), new CharRange(0xC57D, 0xC597, H3), new CharRange(0xC598, 0xC598, H2), new CharRange(0xC599, 0xC5B3, H3), new CharRange(0xC5B4, 0xC5B4, H2), new CharRange(0xC5B5, 0xC5CF, H3), new CharRange(0xC5D0, 0xC5D0, H2), new CharRange(0xC5D1, 0xC5EB, H3), new CharRange(0xC5EC, 0xC5EC, H2), new CharRange(0xC5ED, 0xC607, H3), new CharRange(0xC608, 0xC608, H2), new CharRange(0xC609, 0xC623, H3), new CharRange(0xC624, 0xC624, H2), new CharRange(0xC625, 0xC63F, H3), new CharRange(0xC640, 0xC640, H2), new CharRange(0xC641, 0xC65B, H3), new CharRange(0xC65C, 0xC65C, H2), new CharRange(0xC65D, 0xC677, H3), new CharRange(0xC678, 0xC678, H2), new CharRange(0xC679, 0xC693, H3), new CharRange(0xC694, 0xC694, H2), new CharRange(0xC695, 0xC6AF, H3), new CharRange(0xC6B0, 0xC6B0, H2), new CharRange(0xC6B1, 0xC6CB, H3), new CharRange(0xC6CC, 0xC6CC, H2), new CharRange(0xC6CD, 0xC6E7, H3), new CharRange(0xC6E8, 0xC6E8, H2), new CharRange(0xC6E9, 0xC703, H3), new CharRange(0xC704, 0xC704, H2), new CharRange(0xC705, 0xC71F, H3), new CharRange(0xC720, 0xC720, H2), new CharRange(0xC721, 0xC73B, H3), new CharRange(0xC73C, 0xC73C, H2), new CharRange(0xC73D, 0xC757, H3), new CharRange(0xC758, 0xC758, H2), new CharRange(0xC759, 0xC773, H3), new CharRange(0xC774, 0xC774, H2), new CharRange(0xC775, 0xC78F, H3), new CharRange(0xC790, 0xC790, H2), new CharRange(0xC791, 0xC7AB, H3), new CharRange(0xC7AC, 0xC7AC, H2), new CharRange(0xC7AD, 0xC7C7, H3), new CharRange(0xC7C8, 0xC7C8, H2), new CharRange(0xC7C9, 0xC7E3, H3), new CharRange(0xC7E4, 0xC7E4, H2), new CharRange(0xC7E5, 0xC7FF, H3), new CharRange(0xC800, 0xC800, H2), new CharRange(0xC801, 0xC81B, H3), new CharRange(0xC81C, 0xC81C, H2), new CharRange(0xC81D, 0xC837, H3), new CharRange(0xC838, 0xC838, H2), new CharRange(0xC839, 0xC853, H3), new CharRange(0xC854, 0xC854, H2), new CharRange(0xC855, 0xC86F, H3), new CharRange(0xC870, 0xC870, H2), new CharRange(0xC871, 0xC88B, H3), new CharRange(0xC88C, 0xC88C, H2), new CharRange(0xC88D, 0xC8A7, H3), new CharRange(0xC8A8, 0xC8A8, H2), new CharRange(0xC8A9, 0xC8C3, H3), new CharRange(0xC8C4, 0xC8C4, H2), new CharRange(0xC8C5, 0xC8DF, H3), new CharRange(0xC8E0, 0xC8E0, H2), new CharRange(0xC8E1, 0xC8FB, H3), new CharRange(0xC8FC, 0xC8FC, H2), new CharRange(0xC8FD, 0xC917, H3), new CharRange(0xC918, 0xC918, H2), new CharRange(0xC919, 0xC933, H3), new CharRange(0xC934, 0xC934, H2), new CharRange(0xC935, 0xC94F, H3), new CharRange(0xC950, 0xC950, H2), new CharRange(0xC951, 0xC96B, H3), new CharRange(0xC96C, 0xC96C, H2), new CharRange(0xC96D, 0xC987, H3), new CharRange(0xC988, 0xC988, H2), new CharRange(0xC989, 0xC9A3, H3), new CharRange(0xC9A4, 0xC9A4, H2), new CharRange(0xC9A5, 0xC9BF, H3), new CharRange(0xC9C0, 0xC9C0, H2), new CharRange(0xC9C1, 0xC9DB, H3), new CharRange(0xC9DC, 0xC9DC, H2), new CharRange(0xC9DD, 0xC9F7, H3), new CharRange(0xC9F8, 0xC9F8, H2), new CharRange(0xC9F9, 0xCA13, H3), new CharRange(0xCA14, 0xCA14, H2), new CharRange(0xCA15, 0xCA2F, H3), new CharRange(0xCA30, 0xCA30, H2), new CharRange(0xCA31, 0xCA4B, H3), new CharRange(0xCA4C, 0xCA4C, H2), new CharRange(0xCA4D, 0xCA67, H3), new CharRange(0xCA68, 0xCA68, H2), new CharRange(0xCA69, 0xCA83, H3), new CharRange(0xCA84, 0xCA84, H2), new CharRange(0xCA85, 0xCA9F, H3), new CharRange(0xCAA0, 0xCAA0, H2), new CharRange(0xCAA1, 0xCABB, H3), new CharRange(0xCABC, 0xCABC, H2), new CharRange(0xCABD, 0xCAD7, H3), new CharRange(0xCAD8, 0xCAD8, H2), new CharRange(0xCAD9, 0xCAF3, H3), new CharRange(0xCAF4, 0xCAF4, H2), new CharRange(0xCAF5, 0xCB0F, H3), new CharRange(0xCB10, 0xCB10, H2), new CharRange(0xCB11, 0xCB2B, H3), new CharRange(0xCB2C, 0xCB2C, H2), new CharRange(0xCB2D, 0xCB47, H3), new CharRange(0xCB48, 0xCB48, H2), new CharRange(0xCB49, 0xCB63, H3), new CharRange(0xCB64, 0xCB64, H2), new CharRange(0xCB65, 0xCB7F, H3), new CharRange(0xCB80, 0xCB80, H2), new CharRange(0xCB81, 0xCB9B, H3), new CharRange(0xCB9C, 0xCB9C, H2), new CharRange(0xCB9D, 0xCBB7, H3), new CharRange(0xCBB8, 0xCBB8, H2), new CharRange(0xCBB9, 0xCBD3, H3), new CharRange(0xCBD4, 0xCBD4, H2), new CharRange(0xCBD5, 0xCBEF, H3), new CharRange(0xCBF0, 0xCBF0, H2), new CharRange(0xCBF1, 0xCC0B, H3), new CharRange(0xCC0C, 0xCC0C, H2), new CharRange(0xCC0D, 0xCC27, H3), new CharRange(0xCC28, 0xCC28, H2), new CharRange(0xCC29, 0xCC43, H3), new CharRange(0xCC44, 0xCC44, H2), new CharRange(0xCC45, 0xCC5F, H3), new CharRange(0xCC60, 0xCC60, H2), new CharRange(0xCC61, 0xCC7B, H3), new CharRange(0xCC7C, 0xCC7C, H2), new CharRange(0xCC7D, 0xCC97, H3), new CharRange(0xCC98, 0xCC98, H2), new CharRange(0xCC99, 0xCCB3, H3), new CharRange(0xCCB4, 0xCCB4, H2), new CharRange(0xCCB5, 0xCCCF, H3), new CharRange(0xCCD0, 0xCCD0, H2), new CharRange(0xCCD1, 0xCCEB, H3), new CharRange(0xCCEC, 0xCCEC, H2), new CharRange(0xCCED, 0xCD07, H3), new CharRange(0xCD08, 0xCD08, H2), new CharRange(0xCD09, 0xCD23, H3), new CharRange(0xCD24, 0xCD24, H2), new CharRange(0xCD25, 0xCD3F, H3), new CharRange(0xCD40, 0xCD40, H2), new CharRange(0xCD41, 0xCD5B, H3), new CharRange(0xCD5C, 0xCD5C, H2), new CharRange(0xCD5D, 0xCD77, H3), new CharRange(0xCD78, 0xCD78, H2), new CharRange(0xCD79, 0xCD93, H3), new CharRange(0xCD94, 0xCD94, H2), new CharRange(0xCD95, 0xCDAF, H3), new CharRange(0xCDB0, 0xCDB0, H2), new CharRange(0xCDB1, 0xCDCB, H3), new CharRange(0xCDCC, 0xCDCC, H2), new CharRange(0xCDCD, 0xCDE7, H3), new CharRange(0xCDE8, 0xCDE8, H2), new CharRange(0xCDE9, 0xCE03, H3), new CharRange(0xCE04, 0xCE04, H2), new CharRange(0xCE05, 0xCE1F, H3), new CharRange(0xCE20, 0xCE20, H2), new CharRange(0xCE21, 0xCE3B, H3), new CharRange(0xCE3C, 0xCE3C, H2), new CharRange(0xCE3D, 0xCE57, H3), new CharRange(0xCE58, 0xCE58, H2), new CharRange(0xCE59, 0xCE73, H3), new CharRange(0xCE74, 0xCE74, H2), new CharRange(0xCE75, 0xCE8F, H3), new CharRange(0xCE90, 0xCE90, H2), new CharRange(0xCE91, 0xCEAB, H3), new CharRange(0xCEAC, 0xCEAC, H2), new CharRange(0xCEAD, 0xCEC7, H3), new CharRange(0xCEC8, 0xCEC8, H2), new CharRange(0xCEC9, 0xCEE3, H3), new CharRange(0xCEE4, 0xCEE4, H2), new CharRange(0xCEE5, 0xCEFF, H3), new CharRange(0xCF00, 0xCF00, H2), new CharRange(0xCF01, 0xCF1B, H3), new CharRange(0xCF1C, 0xCF1C, H2), new CharRange(0xCF1D, 0xCF37, H3), new CharRange(0xCF38, 0xCF38, H2), new CharRange(0xCF39, 0xCF53, H3), new CharRange(0xCF54, 0xCF54, H2), new CharRange(0xCF55, 0xCF6F, H3), new CharRange(0xCF70, 0xCF70, H2), new CharRange(0xCF71, 0xCF8B, H3), new CharRange(0xCF8C, 0xCF8C, H2), new CharRange(0xCF8D, 0xCFA7, H3), new CharRange(0xCFA8, 0xCFA8, H2), new CharRange(0xCFA9, 0xCFC3, H3), new CharRange(0xCFC4, 0xCFC4, H2), new CharRange(0xCFC5, 0xCFDF, H3), new CharRange(0xCFE0, 0xCFE0, H2), new CharRange(0xCFE1, 0xCFFB, H3), new CharRange(0xCFFC, 0xCFFC, H2), new CharRange(0xCFFD, 0xD017, H3), new CharRange(0xD018, 0xD018, H2), new CharRange(0xD019, 0xD033, H3), new CharRange(0xD034, 0xD034, H2), new CharRange(0xD035, 0xD04F, H3), new CharRange(0xD050, 0xD050, H2), new CharRange(0xD051, 0xD06B, H3), new CharRange(0xD06C, 0xD06C, H2), new CharRange(0xD06D, 0xD087, H3), new CharRange(0xD088, 0xD088, H2), new CharRange(0xD089, 0xD0A3, H3), new CharRange(0xD0A4, 0xD0A4, H2), new CharRange(0xD0A5, 0xD0BF, H3), new CharRange(0xD0C0, 0xD0C0, H2), new CharRange(0xD0C1, 0xD0DB, H3), new CharRange(0xD0DC, 0xD0DC, H2), new CharRange(0xD0DD, 0xD0F7, H3), new CharRange(0xD0F8, 0xD0F8, H2), new CharRange(0xD0F9, 0xD113, H3), new CharRange(0xD114, 0xD114, H2), new CharRange(0xD115, 0xD12F, H3), new CharRange(0xD130, 0xD130, H2), new CharRange(0xD131, 0xD14B, H3), new CharRange(0xD14C, 0xD14C, H2), new CharRange(0xD14D, 0xD167, H3), new CharRange(0xD168, 0xD168, H2), new CharRange(0xD169, 0xD183, H3), new CharRange(0xD184, 0xD184, H2), new CharRange(0xD185, 0xD19F, H3), new CharRange(0xD1A0, 0xD1A0, H2), new CharRange(0xD1A1, 0xD1BB, H3), new CharRange(0xD1BC, 0xD1BC, H2), new CharRange(0xD1BD, 0xD1D7, H3), new CharRange(0xD1D8, 0xD1D8, H2), new CharRange(0xD1D9, 0xD1F3, H3), new CharRange(0xD1F4, 0xD1F4, H2), new CharRange(0xD1F5, 0xD20F, H3), new CharRange(0xD210, 0xD210, H2), new CharRange(0xD211, 0xD22B, H3), new CharRange(0xD22C, 0xD22C, H2), new CharRange(0xD22D, 0xD247, H3), new CharRange(0xD248, 0xD248, H2), new CharRange(0xD249, 0xD263, H3), new CharRange(0xD264, 0xD264, H2), new CharRange(0xD265, 0xD27F, H3), new CharRange(0xD280, 0xD280, H2), new CharRange(0xD281, 0xD29B, H3), new CharRange(0xD29C, 0xD29C, H2), new CharRange(0xD29D, 0xD2B7, H3), new CharRange(0xD2B8, 0xD2B8, H2), new CharRange(0xD2B9, 0xD2D3, H3), new CharRange(0xD2D4, 0xD2D4, H2), new CharRange(0xD2D5, 0xD2EF, H3), new CharRange(0xD2F0, 0xD2F0, H2), new CharRange(0xD2F1, 0xD30B, H3), new CharRange(0xD30C, 0xD30C, H2), new CharRange(0xD30D, 0xD327, H3), new CharRange(0xD328, 0xD328, H2), new CharRange(0xD329, 0xD343, H3), new CharRange(0xD344, 0xD344, H2), new CharRange(0xD345, 0xD35F, H3), new CharRange(0xD360, 0xD360, H2), new CharRange(0xD361, 0xD37B, H3), new CharRange(0xD37C, 0xD37C, H2), new CharRange(0xD37D, 0xD397, H3), new CharRange(0xD398, 0xD398, H2), new CharRange(0xD399, 0xD3B3, H3), new CharRange(0xD3B4, 0xD3B4, H2), new CharRange(0xD3B5, 0xD3CF, H3), new CharRange(0xD3D0, 0xD3D0, H2), new CharRange(0xD3D1, 0xD3EB, H3), new CharRange(0xD3EC, 0xD3EC, H2), new CharRange(0xD3ED, 0xD407, H3), new CharRange(0xD408, 0xD408, H2), new CharRange(0xD409, 0xD423, H3), new CharRange(0xD424, 0xD424, H2), new CharRange(0xD425, 0xD43F, H3), new CharRange(0xD440, 0xD440, H2), new CharRange(0xD441, 0xD45B, H3), new CharRange(0xD45C, 0xD45C, H2), new CharRange(0xD45D, 0xD477, H3), new CharRange(0xD478, 0xD478, H2), new CharRange(0xD479, 0xD493, H3), new CharRange(0xD494, 0xD494, H2), new CharRange(0xD495, 0xD4AF, H3), new CharRange(0xD4B0, 0xD4B0, H2), new CharRange(0xD4B1, 0xD4CB, H3), new CharRange(0xD4CC, 0xD4CC, H2), new CharRange(0xD4CD, 0xD4E7, H3), new CharRange(0xD4E8, 0xD4E8, H2), new CharRange(0xD4E9, 0xD503, H3), new CharRange(0xD504, 0xD504, H2), new CharRange(0xD505, 0xD51F, H3), new CharRange(0xD520, 0xD520, H2), new CharRange(0xD521, 0xD53B, H3), new CharRange(0xD53C, 0xD53C, H2), new CharRange(0xD53D, 0xD557, H3), new CharRange(0xD558, 0xD558, H2), new CharRange(0xD559, 0xD573, H3), new CharRange(0xD574, 0xD574, H2), new CharRange(0xD575, 0xD58F, H3), new CharRange(0xD590, 0xD590, H2), new CharRange(0xD591, 0xD5AB, H3), new CharRange(0xD5AC, 0xD5AC, H2), new CharRange(0xD5AD, 0xD5C7, H3), new CharRange(0xD5C8, 0xD5C8, H2), new CharRange(0xD5C9, 0xD5E3, H3), new CharRange(0xD5E4, 0xD5E4, H2), new CharRange(0xD5E5, 0xD5FF, H3), new CharRange(0xD600, 0xD600, H2), new CharRange(0xD601, 0xD61B, H3), new CharRange(0xD61C, 0xD61C, H2), new CharRange(0xD61D, 0xD637, H3), new CharRange(0xD638, 0xD638, H2), new CharRange(0xD639, 0xD653, H3), new CharRange(0xD654, 0xD654, H2), new CharRange(0xD655, 0xD66F, H3), new CharRange(0xD670, 0xD670, H2), new CharRange(0xD671, 0xD68B, H3), new CharRange(0xD68C, 0xD68C, H2), new CharRange(0xD68D, 0xD6A7, H3), new CharRange(0xD6A8, 0xD6A8, H2), new CharRange(0xD6A9, 0xD6C3, H3), new CharRange(0xD6C4, 0xD6C4, H2), new CharRange(0xD6C5, 0xD6DF, H3), new CharRange(0xD6E0, 0xD6E0, H2), new CharRange(0xD6E1, 0xD6FB, H3), new CharRange(0xD6FC, 0xD6FC, H2), new CharRange(0xD6FD, 0xD717, H3), new CharRange(0xD718, 0xD718, H2), new CharRange(0xD719, 0xD733, H3), new CharRange(0xD734, 0xD734, H2), new CharRange(0xD735, 0xD74F, H3), new CharRange(0xD750, 0xD750, H2), new CharRange(0xD751, 0xD76B, H3), new CharRange(0xD76C, 0xD76C, H2), new CharRange(0xD76D, 0xD787, H3), new CharRange(0xD788, 0xD788, H2), new CharRange(0xD789, 0xD7A3, H3), new CharRange(0xD7B0, 0xD7C6, JV), new CharRange(0xD7CB, 0xD7FB, JT), new CharRange(0xD800, 0xDFFF, SG), new CharRange(0xE000, 0xF8FF, XX), new CharRange(0xF900, 0xFAFF, ID), new CharRange(0xFB00, 0xFB17, AL), new CharRange(0xFB1D, 0xFB1D, HL), new CharRange(0xFB1E, 0xFB1E, CM), new CharRange(0xFB1F, 0xFB28, HL), new CharRange(0xFB29, 0xFB29, AL), new CharRange(0xFB2A, 0xFB4F, HL), new CharRange(0xFB50, 0xFD3D, AL), new CharRange(0xFD3E, 0xFD3E, OP), new CharRange(0xFD3F, 0xFD3F, CL), new CharRange(0xFD50, 0xFDFB, AL), new CharRange(0xFDFC, 0xFDFC, PO), new CharRange(0xFDFD, 0xFDFD, AL), new CharRange(0xFE00, 0xFE0F, CM), new CharRange(0xFE10, 0xFE10, IS), new CharRange(0xFE11, 0xFE12, CL), new CharRange(0xFE13, 0xFE14, IS), new CharRange(0xFE15, 0xFE16, EX), new CharRange(0xFE17, 0xFE17, OP), new CharRange(0xFE18, 0xFE18, CL), new CharRange(0xFE19, 0xFE19, IN), new CharRange(0xFE20, 0xFE26, CM), new CharRange(0xFE30, 0xFE34, ID), new CharRange(0xFE35, 0xFE35, OP), new CharRange(0xFE36, 0xFE36, CL), new CharRange(0xFE37, 0xFE37, OP), new CharRange(0xFE38, 0xFE38, CL), new CharRange(0xFE39, 0xFE39, OP), new CharRange(0xFE3A, 0xFE3A, CL), new CharRange(0xFE3B, 0xFE3B, OP), new CharRange(0xFE3C, 0xFE3C, CL), new CharRange(0xFE3D, 0xFE3D, OP), new CharRange(0xFE3E, 0xFE3E, CL), new CharRange(0xFE3F, 0xFE3F, OP), new CharRange(0xFE40, 0xFE40, CL), new CharRange(0xFE41, 0xFE41, OP), new CharRange(0xFE42, 0xFE42, CL), new CharRange(0xFE43, 0xFE43, OP), new CharRange(0xFE44, 0xFE44, CL), new CharRange(0xFE45, 0xFE46, ID), new CharRange(0xFE47, 0xFE47, OP), new CharRange(0xFE48, 0xFE48, CL), new CharRange(0xFE49, 0xFE4F, ID), new CharRange(0xFE50, 0xFE50, CL), new CharRange(0xFE51, 0xFE51, ID), new CharRange(0xFE52, 0xFE52, CL), new CharRange(0xFE54, 0xFE55, NS), new CharRange(0xFE56, 0xFE57, EX), new CharRange(0xFE58, 0xFE58, ID), new CharRange(0xFE59, 0xFE59, OP), new CharRange(0xFE5A, 0xFE5A, CL), new CharRange(0xFE5B, 0xFE5B, OP), new CharRange(0xFE5C, 0xFE5C, CL), new CharRange(0xFE5D, 0xFE5D, OP), new CharRange(0xFE5E, 0xFE5E, CL), new CharRange(0xFE5F, 0xFE68, ID), new CharRange(0xFE69, 0xFE69, PR), new CharRange(0xFE6A, 0xFE6A, PO), new CharRange(0xFE6B, 0xFE6B, ID), new CharRange(0xFE70, 0xFEFC, AL), new CharRange(0xFEFF, 0xFEFF, WJ), new CharRange(0xFF01, 0xFF01, EX), new CharRange(0xFF02, 0xFF03, ID), new CharRange(0xFF04, 0xFF04, PR), new CharRange(0xFF05, 0xFF05, PO), new CharRange(0xFF06, 0xFF07, ID), new CharRange(0xFF08, 0xFF08, OP), new CharRange(0xFF09, 0xFF09, CL), new CharRange(0xFF0A, 0xFF0B, ID), new CharRange(0xFF0C, 0xFF0C, CL), new CharRange(0xFF0D, 0xFF0D, ID), new CharRange(0xFF0E, 0xFF0E, CL), new CharRange(0xFF0F, 0xFF19, ID), new CharRange(0xFF1A, 0xFF1B, NS), new CharRange(0xFF1C, 0xFF1E, ID), new CharRange(0xFF1F, 0xFF1F, EX), new CharRange(0xFF20, 0xFF3A, ID), new CharRange(0xFF3B, 0xFF3B, OP), new CharRange(0xFF3C, 0xFF3C, ID), new CharRange(0xFF3D, 0xFF3D, CL), new CharRange(0xFF3E, 0xFF5A, ID), new CharRange(0xFF5B, 0xFF5B, OP), new CharRange(0xFF5C, 0xFF5C, ID), new CharRange(0xFF5D, 0xFF5D, CL), new CharRange(0xFF5E, 0xFF5E, ID), new CharRange(0xFF5F, 0xFF5F, OP), new CharRange(0xFF60, 0xFF61, CL), new CharRange(0xFF62, 0xFF62, OP), new CharRange(0xFF63, 0xFF64, CL), new CharRange(0xFF65, 0xFF65, NS), new CharRange(0xFF66, 0xFF66, AL), new CharRange(0xFF67, 0xFF70, CJ), new CharRange(0xFF71, 0xFF9D, AL), new CharRange(0xFF9E, 0xFF9F, NS), new CharRange(0xFFA0, 0xFFDC, AL), new CharRange(0xFFE0, 0xFFE0, PO), new CharRange(0xFFE1, 0xFFE1, PR), new CharRange(0xFFE2, 0xFFE4, ID), new CharRange(0xFFE5, 0xFFE6, PR), new CharRange(0xFFE8, 0xFFEE, AL), new CharRange(0xFFF9, 0xFFFB, CM), new CharRange(0xFFFC, 0xFFFC, CB), new CharRange(0xFFFD, 0xFFFD, AI), new CharRange(0x10000, 0x100FA, AL), new CharRange(0x10100, 0x10102, BA), new CharRange(0x10107, 0x101FC, AL), new CharRange(0x101FD, 0x101FD, CM), new CharRange(0x10280, 0x1039D, AL), new CharRange(0x1039F, 0x1039F, BA), new CharRange(0x103A0, 0x103CF, AL), new CharRange(0x103D0, 0x103D0, BA), new CharRange(0x103D1, 0x1049D, AL), new CharRange(0x104A0, 0x104A9, NU), new CharRange(0x10800, 0x10855, AL), new CharRange(0x10857, 0x10857, BA), new CharRange(0x10858, 0x1091B, AL), new CharRange(0x1091F, 0x1091F, BA), new CharRange(0x10920, 0x10A00, AL), new CharRange(0x10A01, 0x10A0F, CM), new CharRange(0x10A10, 0x10A33, AL), new CharRange(0x10A38, 0x10A3F, CM), new CharRange(0x10A40, 0x10A47, AL), new CharRange(0x10A50, 0x10A57, BA), new CharRange(0x10A58, 0x10B35, AL), new CharRange(0x10B39, 0x10B3F, BA), new CharRange(0x10B40, 0x10E7E, AL), new CharRange(0x11000, 0x11002, CM), new CharRange(0x11003, 0x11037, AL), new CharRange(0x11038, 0x11046, CM), new CharRange(0x11047, 0x11048, BA), new CharRange(0x11049, 0x11065, AL), new CharRange(0x11066, 0x1106F, NU), new CharRange(0x11080, 0x11082, CM), new CharRange(0x11083, 0x110AF, AL), new CharRange(0x110B0, 0x110BA, CM), new CharRange(0x110BB, 0x110BD, AL), new CharRange(0x110BE, 0x110C1, BA), new CharRange(0x110D0, 0x110E8, AL), new CharRange(0x110F0, 0x110F9, NU), new CharRange(0x11100, 0x11102, CM), new CharRange(0x11103, 0x11126, AL), new CharRange(0x11127, 0x11134, CM), new CharRange(0x11136, 0x1113F, NU), new CharRange(0x11140, 0x11143, BA), new CharRange(0x11180, 0x11182, CM), new CharRange(0x11183, 0x111B2, AL), new CharRange(0x111B3, 0x111C0, CM), new CharRange(0x111C1, 0x111C4, AL), new CharRange(0x111C5, 0x111C6, BA), new CharRange(0x111C7, 0x111C7, AL), new CharRange(0x111C8, 0x111C8, BA), new CharRange(0x111D0, 0x111D9, NU), new CharRange(0x11680, 0x116AA, AL), new CharRange(0x116AB, 0x116B7, CM), new CharRange(0x116C0, 0x116C9, NU), new CharRange(0x12000, 0x12462, AL), new CharRange(0x12470, 0x12473, BA), new CharRange(0x13000, 0x13257, AL), new CharRange(0x13258, 0x1325A, OP), new CharRange(0x1325B, 0x1325D, CL), new CharRange(0x1325E, 0x13281, AL), new CharRange(0x13282, 0x13282, CL), new CharRange(0x13283, 0x13285, AL), new CharRange(0x13286, 0x13286, OP), new CharRange(0x13287, 0x13287, CL), new CharRange(0x13288, 0x13288, OP), new CharRange(0x13289, 0x13289, CL), new CharRange(0x1328A, 0x13378, AL), new CharRange(0x13379, 0x13379, OP), new CharRange(0x1337A, 0x1337B, CL), new CharRange(0x1337C, 0x16F50, AL), new CharRange(0x16F51, 0x16F92, CM), new CharRange(0x16F93, 0x16F9F, AL), new CharRange(0x1B000, 0x1B001, ID), new CharRange(0x1D000, 0x1D164, AL), new CharRange(0x1D165, 0x1D169, CM), new CharRange(0x1D16A, 0x1D16C, AL), new CharRange(0x1D16D, 0x1D182, CM), new CharRange(0x1D183, 0x1D184, AL), new CharRange(0x1D185, 0x1D18B, CM), new CharRange(0x1D18C, 0x1D1A9, AL), new CharRange(0x1D1AA, 0x1D1AD, CM), new CharRange(0x1D1AE, 0x1D241, AL), new CharRange(0x1D242, 0x1D244, CM), new CharRange(0x1D245, 0x1D7CB, AL), new CharRange(0x1D7CE, 0x1D7FF, NU), new CharRange(0x1EE00, 0x1EEF1, AL), new CharRange(0x1F000, 0x1F0DF, ID), new CharRange(0x1F100, 0x1F12D, AI), new CharRange(0x1F12E, 0x1F12E, AL), new CharRange(0x1F130, 0x1F169, AI), new CharRange(0x1F16A, 0x1F16B, AL), new CharRange(0x1F170, 0x1F19A, AI), new CharRange(0x1F1E6, 0x1F1FF, RI), new CharRange(0x1F200, 0x1F3B4, ID), new CharRange(0x1F3B5, 0x1F3B6, AL), new CharRange(0x1F3B7, 0x1F3BB, ID), new CharRange(0x1F3BC, 0x1F3BC, AL), new CharRange(0x1F3BD, 0x1F49F, ID), new CharRange(0x1F4A0, 0x1F4A0, AL), new CharRange(0x1F4A1, 0x1F4A1, ID), new CharRange(0x1F4A2, 0x1F4A2, AL), new CharRange(0x1F4A3, 0x1F4A3, ID), new CharRange(0x1F4A4, 0x1F4A4, AL), new CharRange(0x1F4A5, 0x1F4AE, ID), new CharRange(0x1F4AF, 0x1F4AF, AL), new CharRange(0x1F4B0, 0x1F4B0, ID), new CharRange(0x1F4B1, 0x1F4B2, AL), new CharRange(0x1F4B3, 0x1F4FC, ID), new CharRange(0x1F500, 0x1F506, AL), new CharRange(0x1F507, 0x1F516, ID), new CharRange(0x1F517, 0x1F524, AL), new CharRange(0x1F525, 0x1F531, ID), new CharRange(0x1F532, 0x1F543, AL), new CharRange(0x1F550, 0x1F6C5, ID), new CharRange(0x1F700, 0x1F773, AL), new CharRange(0x20000, 0x3FFFD, ID), new CharRange(0xE0001, 0xE01EF, CM), new CharRange(0xF0000, 0x10FFFD, XX)];

}).call(this);

},{}],53:[function(_dereq_,module,exports){
// Generated by CoffeeScript 1.7.1
(function() {
  var AI, AL, BA, BK, CB, CI_BRK, CJ, CP_BRK, CR, DI_BRK, ID, IN_BRK, LF, LineBreaker, NL, NS, PR_BRK, SA, SG, SP, WJ, XX, characterClasses, pairTable, _ref, _ref1;

  _ref = _dereq_('./classes'), BK = _ref.BK, CR = _ref.CR, LF = _ref.LF, NL = _ref.NL, CB = _ref.CB, BA = _ref.BA, SP = _ref.SP, WJ = _ref.WJ, SP = _ref.SP, BK = _ref.BK, LF = _ref.LF, NL = _ref.NL, AI = _ref.AI, AL = _ref.AL, SA = _ref.SA, SG = _ref.SG, XX = _ref.XX, CJ = _ref.CJ, ID = _ref.ID, NS = _ref.NS, characterClasses = _ref.characterClasses;

  _ref1 = _dereq_('./pairs'), DI_BRK = _ref1.DI_BRK, IN_BRK = _ref1.IN_BRK, CI_BRK = _ref1.CI_BRK, CP_BRK = _ref1.CP_BRK, PR_BRK = _ref1.PR_BRK, pairTable = _ref1.pairTable;

  LineBreaker = (function() {
    var Break, getCharClass, mapClass, mapFirst;

    function LineBreaker(string) {
      this.string = string;
      this.pos = 0;
      this.lastPos = 0;
      this.curClass = null;
      this.nextClass = null;
    }

    LineBreaker.prototype.nextCodePoint = function() {
      var code, next;
      code = this.string.charCodeAt(this.pos++);
      next = this.string.charCodeAt(this.pos);
      if ((0xd800 <= code && code <= 0xdbff) && (0xdc00 <= next && next <= 0xdfff)) {
        this.pos++;
        return ((code - 0xd800) * 0x400) + (next - 0xdc00) + 0x10000;
      }
      return code;
    };

    getCharClass = function(char) {
      var high, low, mid, range;
      low = 0;
      high = characterClasses.length;
      while (low < high) {
        mid = (low + high) >>> 1;
        range = characterClasses[mid];
        if (char > range.end) {
          low = mid + 1;
        } else if (char < range.start) {
          high = mid;
        } else {
          return range["class"];
        }
      }
      return XX;
    };

    mapClass = function(c) {
      switch (c) {
        case AI:
          return AL;
        case SA:
        case SG:
        case XX:
          return AL;
        case CJ:
          return NS;
        default:
          return c;
      }
    };

    mapFirst = function(c) {
      switch (c) {
        case LF:
        case NL:
          return BK;
        case CB:
          return BA;
        case SP:
          return WJ;
        default:
          return c;
      }
    };

    LineBreaker.prototype.nextCharClass = function(first) {
      if (first == null) {
        first = false;
      }
      return mapClass(getCharClass(this.nextCodePoint()));
    };

    Break = (function() {
      function Break(position, required) {
        this.position = position;
        this.required = required != null ? required : false;
      }

      return Break;

    })();

    LineBreaker.prototype.nextBreak = function() {
      var cur, lastClass, shouldBreak;
      if (this.curClass == null) {
        this.curClass = mapFirst(this.nextCharClass());
      }
      while (this.pos < this.string.length) {
        this.lastPos = this.pos;
        lastClass = this.nextClass;
        this.nextClass = this.nextCharClass();
        if (this.curClass === BK || (this.curClass === CR && this.nextClass !== LF)) {
          this.curClass = mapFirst(mapClass(this.nextClass));
          return new Break(this.lastPos, true);
        }
        cur = (function() {
          switch (this.nextClass) {
            case SP:
              return this.curClass;
            case BK:
            case LF:
            case NL:
              return BK;
            case CR:
              return CR;
            case CB:
              return BA;
          }
        }).call(this);
        if (cur != null) {
          this.curClass = cur;
          if (this.nextClass === CB) {
            return new Break(this.lastPos);
          }
          continue;
        }
        shouldBreak = false;
        switch (pairTable[this.curClass][this.nextClass]) {
          case DI_BRK:
            shouldBreak = true;
            break;
          case IN_BRK:
            shouldBreak = lastClass === SP;
            break;
          case CI_BRK:
            shouldBreak = lastClass === SP;
            if (!shouldBreak) {
              continue;
            }
            break;
          case CP_BRK:
            if (lastClass !== SP) {
              continue;
            }
        }
        this.curClass = this.nextClass;
        if (shouldBreak) {
          return new Break(this.lastPos);
        }
      }
      if (this.pos >= this.string.length) {
        if (this.lastPos < this.string.length) {
          this.lastPos = this.string.length;
          return new Break(this.string.length);
        } else {
          return null;
        }
      }
    };

    return LineBreaker;

  })();

  module.exports = LineBreaker;

}).call(this);

},{"./classes":52,"./pairs":54}],54:[function(_dereq_,module,exports){
// Generated by CoffeeScript 1.7.1
(function() {
  var CI_BRK, CP_BRK, DI_BRK, IN_BRK, PR_BRK;

  exports.DI_BRK = DI_BRK = 0;

  exports.IN_BRK = IN_BRK = 1;

  exports.CI_BRK = CI_BRK = 2;

  exports.CP_BRK = CP_BRK = 3;

  exports.PR_BRK = PR_BRK = 4;

  exports.pairTable = [[PR_BRK, PR_BRK, PR_BRK, PR_BRK, PR_BRK, PR_BRK, PR_BRK, PR_BRK, PR_BRK, PR_BRK, PR_BRK, PR_BRK, PR_BRK, PR_BRK, PR_BRK, PR_BRK, PR_BRK, PR_BRK, PR_BRK, PR_BRK, PR_BRK, CP_BRK, PR_BRK, PR_BRK, PR_BRK, PR_BRK, PR_BRK, PR_BRK, PR_BRK], [DI_BRK, PR_BRK, PR_BRK, IN_BRK, IN_BRK, PR_BRK, PR_BRK, PR_BRK, PR_BRK, IN_BRK, IN_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, IN_BRK, IN_BRK, DI_BRK, DI_BRK, PR_BRK, CI_BRK, PR_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK], [DI_BRK, PR_BRK, PR_BRK, IN_BRK, IN_BRK, PR_BRK, PR_BRK, PR_BRK, PR_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, DI_BRK, DI_BRK, IN_BRK, IN_BRK, DI_BRK, DI_BRK, PR_BRK, CI_BRK, PR_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK], [PR_BRK, PR_BRK, PR_BRK, IN_BRK, IN_BRK, IN_BRK, PR_BRK, PR_BRK, PR_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, PR_BRK, CI_BRK, PR_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK], [IN_BRK, PR_BRK, PR_BRK, IN_BRK, IN_BRK, IN_BRK, PR_BRK, PR_BRK, PR_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, PR_BRK, CI_BRK, PR_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK], [DI_BRK, PR_BRK, PR_BRK, IN_BRK, IN_BRK, IN_BRK, PR_BRK, PR_BRK, PR_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, IN_BRK, IN_BRK, DI_BRK, DI_BRK, PR_BRK, CI_BRK, PR_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK], [DI_BRK, PR_BRK, PR_BRK, IN_BRK, IN_BRK, IN_BRK, PR_BRK, PR_BRK, PR_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, IN_BRK, IN_BRK, DI_BRK, DI_BRK, PR_BRK, CI_BRK, PR_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK], [DI_BRK, PR_BRK, PR_BRK, IN_BRK, IN_BRK, IN_BRK, PR_BRK, PR_BRK, PR_BRK, DI_BRK, DI_BRK, IN_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, IN_BRK, IN_BRK, DI_BRK, DI_BRK, PR_BRK, CI_BRK, PR_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK], [DI_BRK, PR_BRK, PR_BRK, IN_BRK, IN_BRK, IN_BRK, PR_BRK, PR_BRK, PR_BRK, DI_BRK, DI_BRK, IN_BRK, IN_BRK, IN_BRK, DI_BRK, DI_BRK, IN_BRK, IN_BRK, DI_BRK, DI_BRK, PR_BRK, CI_BRK, PR_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK], [IN_BRK, PR_BRK, PR_BRK, IN_BRK, IN_BRK, IN_BRK, PR_BRK, PR_BRK, PR_BRK, DI_BRK, DI_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, DI_BRK, IN_BRK, IN_BRK, DI_BRK, DI_BRK, PR_BRK, CI_BRK, PR_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, DI_BRK], [IN_BRK, PR_BRK, PR_BRK, IN_BRK, IN_BRK, IN_BRK, PR_BRK, PR_BRK, PR_BRK, DI_BRK, DI_BRK, IN_BRK, IN_BRK, IN_BRK, DI_BRK, DI_BRK, IN_BRK, IN_BRK, DI_BRK, DI_BRK, PR_BRK, CI_BRK, PR_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK], [IN_BRK, PR_BRK, PR_BRK, IN_BRK, IN_BRK, IN_BRK, PR_BRK, PR_BRK, PR_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, DI_BRK, IN_BRK, IN_BRK, IN_BRK, DI_BRK, DI_BRK, PR_BRK, CI_BRK, PR_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK], [IN_BRK, PR_BRK, PR_BRK, IN_BRK, IN_BRK, IN_BRK, PR_BRK, PR_BRK, PR_BRK, DI_BRK, DI_BRK, IN_BRK, IN_BRK, IN_BRK, DI_BRK, IN_BRK, IN_BRK, IN_BRK, DI_BRK, DI_BRK, PR_BRK, CI_BRK, PR_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK], [IN_BRK, PR_BRK, PR_BRK, IN_BRK, IN_BRK, IN_BRK, PR_BRK, PR_BRK, PR_BRK, DI_BRK, DI_BRK, IN_BRK, IN_BRK, IN_BRK, DI_BRK, IN_BRK, IN_BRK, IN_BRK, DI_BRK, DI_BRK, PR_BRK, CI_BRK, PR_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK], [DI_BRK, PR_BRK, PR_BRK, IN_BRK, IN_BRK, IN_BRK, PR_BRK, PR_BRK, PR_BRK, DI_BRK, IN_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, IN_BRK, IN_BRK, IN_BRK, DI_BRK, DI_BRK, PR_BRK, CI_BRK, PR_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK], [DI_BRK, PR_BRK, PR_BRK, IN_BRK, IN_BRK, IN_BRK, PR_BRK, PR_BRK, PR_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, IN_BRK, IN_BRK, IN_BRK, DI_BRK, DI_BRK, PR_BRK, CI_BRK, PR_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK], [DI_BRK, PR_BRK, PR_BRK, IN_BRK, DI_BRK, IN_BRK, PR_BRK, PR_BRK, PR_BRK, DI_BRK, DI_BRK, IN_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, IN_BRK, IN_BRK, DI_BRK, DI_BRK, PR_BRK, CI_BRK, PR_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK], [DI_BRK, PR_BRK, PR_BRK, IN_BRK, DI_BRK, IN_BRK, PR_BRK, PR_BRK, PR_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, IN_BRK, IN_BRK, DI_BRK, DI_BRK, PR_BRK, CI_BRK, PR_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK], [IN_BRK, PR_BRK, PR_BRK, IN_BRK, IN_BRK, IN_BRK, PR_BRK, PR_BRK, PR_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, PR_BRK, CI_BRK, PR_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK], [DI_BRK, PR_BRK, PR_BRK, IN_BRK, IN_BRK, IN_BRK, PR_BRK, PR_BRK, PR_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, IN_BRK, IN_BRK, DI_BRK, PR_BRK, PR_BRK, CI_BRK, PR_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK], [DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, PR_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK], [IN_BRK, PR_BRK, PR_BRK, IN_BRK, IN_BRK, IN_BRK, PR_BRK, PR_BRK, PR_BRK, DI_BRK, DI_BRK, IN_BRK, IN_BRK, IN_BRK, DI_BRK, IN_BRK, IN_BRK, IN_BRK, DI_BRK, DI_BRK, PR_BRK, CI_BRK, PR_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK], [IN_BRK, PR_BRK, PR_BRK, IN_BRK, IN_BRK, IN_BRK, PR_BRK, PR_BRK, PR_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, PR_BRK, CI_BRK, PR_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK], [DI_BRK, PR_BRK, PR_BRK, IN_BRK, IN_BRK, IN_BRK, PR_BRK, PR_BRK, PR_BRK, DI_BRK, IN_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, IN_BRK, IN_BRK, IN_BRK, DI_BRK, DI_BRK, PR_BRK, CI_BRK, PR_BRK, DI_BRK, DI_BRK, DI_BRK, IN_BRK, IN_BRK, DI_BRK], [DI_BRK, PR_BRK, PR_BRK, IN_BRK, IN_BRK, IN_BRK, PR_BRK, PR_BRK, PR_BRK, DI_BRK, IN_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, IN_BRK, IN_BRK, IN_BRK, DI_BRK, DI_BRK, PR_BRK, CI_BRK, PR_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, IN_BRK, DI_BRK], [DI_BRK, PR_BRK, PR_BRK, IN_BRK, IN_BRK, IN_BRK, PR_BRK, PR_BRK, PR_BRK, DI_BRK, IN_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, IN_BRK, IN_BRK, IN_BRK, DI_BRK, DI_BRK, PR_BRK, CI_BRK, PR_BRK, IN_BRK, IN_BRK, IN_BRK, IN_BRK, DI_BRK, DI_BRK], [DI_BRK, PR_BRK, PR_BRK, IN_BRK, IN_BRK, IN_BRK, PR_BRK, PR_BRK, PR_BRK, DI_BRK, IN_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, IN_BRK, IN_BRK, IN_BRK, DI_BRK, DI_BRK, PR_BRK, CI_BRK, PR_BRK, DI_BRK, DI_BRK, DI_BRK, IN_BRK, IN_BRK, DI_BRK], [DI_BRK, PR_BRK, PR_BRK, IN_BRK, IN_BRK, IN_BRK, PR_BRK, PR_BRK, PR_BRK, DI_BRK, IN_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, IN_BRK, IN_BRK, IN_BRK, DI_BRK, DI_BRK, PR_BRK, CI_BRK, PR_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, IN_BRK, DI_BRK], [DI_BRK, PR_BRK, PR_BRK, IN_BRK, IN_BRK, IN_BRK, PR_BRK, PR_BRK, PR_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, IN_BRK, IN_BRK, DI_BRK, DI_BRK, PR_BRK, CI_BRK, PR_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, DI_BRK, IN_BRK]];

}).call(this);

},{}],55:[function(_dereq_,module,exports){
(function (Buffer){
// Generated by CoffeeScript 1.4.0

/*
# MIT LICENSE
# Copyright (c) 2011 Devon Govett
# 
# Permission is hereby granted, free of charge, to any person obtaining a copy of this 
# software and associated documentation files (the "Software"), to deal in the Software 
# without restriction, including without limitation the rights to use, copy, modify, merge, 
# publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons 
# to whom the Software is furnished to do so, subject to the following conditions:
# 
# The above copyright notice and this permission notice shall be included in all copies or 
# substantial portions of the Software.
# 
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING 
# BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND 
# NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, 
# DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, 
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/


(function() {
  var PNG, fs, zlib;

  fs = _dereq_('fs');

  zlib = _dereq_('zlib');

  module.exports = PNG = (function() {

    PNG.decode = function(path, fn) {
      return fs.readFile(path, function(err, file) {
        var png;
        png = new PNG(file);
        return png.decode(function(pixels) {
          return fn(pixels);
        });
      });
    };

    PNG.load = function(path) {
      var file;
      file = fs.readFileSync(path);
      return new PNG(file);
    };

    function PNG(data) {
      var chunkSize, colors, i, index, key, section, short, text, _i, _j, _ref;
      this.data = data;
      this.pos = 8;
      this.palette = [];
      this.imgData = [];
      this.transparency = {};
      this.text = {};
      while (true) {
        chunkSize = this.readUInt32();
        section = ((function() {
          var _i, _results;
          _results = [];
          for (i = _i = 0; _i < 4; i = ++_i) {
            _results.push(String.fromCharCode(this.data[this.pos++]));
          }
          return _results;
        }).call(this)).join('');
        switch (section) {
          case 'IHDR':
            this.width = this.readUInt32();
            this.height = this.readUInt32();
            this.bits = this.data[this.pos++];
            this.colorType = this.data[this.pos++];
            this.compressionMethod = this.data[this.pos++];
            this.filterMethod = this.data[this.pos++];
            this.interlaceMethod = this.data[this.pos++];
            break;
          case 'PLTE':
            this.palette = this.read(chunkSize);
            break;
          case 'IDAT':
            for (i = _i = 0; _i < chunkSize; i = _i += 1) {
              this.imgData.push(this.data[this.pos++]);
            }
            break;
          case 'tRNS':
            this.transparency = {};
            switch (this.colorType) {
              case 3:
                this.transparency.indexed = this.read(chunkSize);
                short = 255 - this.transparency.indexed.length;
                if (short > 0) {
                  for (i = _j = 0; 0 <= short ? _j < short : _j > short; i = 0 <= short ? ++_j : --_j) {
                    this.transparency.indexed.push(255);
                  }
                }
                break;
              case 0:
                this.transparency.grayscale = this.read(chunkSize)[0];
                break;
              case 2:
                this.transparency.rgb = this.read(chunkSize);
            }
            break;
          case 'tEXt':
            text = this.read(chunkSize);
            index = text.indexOf(0);
            key = String.fromCharCode.apply(String, text.slice(0, index));
            this.text[key] = String.fromCharCode.apply(String, text.slice(index + 1));
            break;
          case 'IEND':
            this.colors = (function() {
              switch (this.colorType) {
                case 0:
                case 3:
                case 4:
                  return 1;
                case 2:
                case 6:
                  return 3;
              }
            }).call(this);
            this.hasAlphaChannel = (_ref = this.colorType) === 4 || _ref === 6;
            colors = this.colors + (this.hasAlphaChannel ? 1 : 0);
            this.pixelBitlength = this.bits * colors;
            this.colorSpace = (function() {
              switch (this.colors) {
                case 1:
                  return 'DeviceGray';
                case 3:
                  return 'DeviceRGB';
              }
            }).call(this);
            this.imgData = new Buffer(this.imgData);
            return;
          default:
            this.pos += chunkSize;
        }
        this.pos += 4;
        if (this.pos > this.data.length) {
          throw new Error("Incomplete or corrupt PNG file");
        }
      }
      return;
    }

    PNG.prototype.read = function(bytes) {
      var i, _i, _results;
      _results = [];
      for (i = _i = 0; 0 <= bytes ? _i < bytes : _i > bytes; i = 0 <= bytes ? ++_i : --_i) {
        _results.push(this.data[this.pos++]);
      }
      return _results;
    };

    PNG.prototype.readUInt32 = function() {
      var b1, b2, b3, b4;
      b1 = this.data[this.pos++] << 24;
      b2 = this.data[this.pos++] << 16;
      b3 = this.data[this.pos++] << 8;
      b4 = this.data[this.pos++];
      return b1 | b2 | b3 | b4;
    };

    PNG.prototype.readUInt16 = function() {
      var b1, b2;
      b1 = this.data[this.pos++] << 8;
      b2 = this.data[this.pos++];
      return b1 | b2;
    };

    PNG.prototype.decodePixels = function(fn) {
      var _this = this;
      return zlib.inflate(this.imgData, function(err, data) {
        var byte, c, col, i, left, length, p, pa, paeth, pb, pc, pixelBytes, pixels, pos, row, scanlineLength, upper, upperLeft, _i, _j, _k, _l, _m;
        if (err) {
          throw err;
        }
        pixelBytes = _this.pixelBitlength / 8;
        scanlineLength = pixelBytes * _this.width;
        pixels = new Buffer(scanlineLength * _this.height);
        length = data.length;
        row = 0;
        pos = 0;
        c = 0;
        while (pos < length) {
          switch (data[pos++]) {
            case 0:
              for (i = _i = 0; _i < scanlineLength; i = _i += 1) {
                pixels[c++] = data[pos++];
              }
              break;
            case 1:
              for (i = _j = 0; _j < scanlineLength; i = _j += 1) {
                byte = data[pos++];
                left = i < pixelBytes ? 0 : pixels[c - pixelBytes];
                pixels[c++] = (byte + left) % 256;
              }
              break;
            case 2:
              for (i = _k = 0; _k < scanlineLength; i = _k += 1) {
                byte = data[pos++];
                col = (i - (i % pixelBytes)) / pixelBytes;
                upper = row && pixels[(row - 1) * scanlineLength + col * pixelBytes + (i % pixelBytes)];
                pixels[c++] = (upper + byte) % 256;
              }
              break;
            case 3:
              for (i = _l = 0; _l < scanlineLength; i = _l += 1) {
                byte = data[pos++];
                col = (i - (i % pixelBytes)) / pixelBytes;
                left = i < pixelBytes ? 0 : pixels[c - pixelBytes];
                upper = row && pixels[(row - 1) * scanlineLength + col * pixelBytes + (i % pixelBytes)];
                pixels[c++] = (byte + Math.floor((left + upper) / 2)) % 256;
              }
              break;
            case 4:
              for (i = _m = 0; _m < scanlineLength; i = _m += 1) {
                byte = data[pos++];
                col = (i - (i % pixelBytes)) / pixelBytes;
                left = i < pixelBytes ? 0 : pixels[c - pixelBytes];
                if (row === 0) {
                  upper = upperLeft = 0;
                } else {
                  upper = pixels[(row - 1) * scanlineLength + col * pixelBytes + (i % pixelBytes)];
                  upperLeft = col && pixels[(row - 1) * scanlineLength + (col - 1) * pixelBytes + (i % pixelBytes)];
                }
                p = left + upper - upperLeft;
                pa = Math.abs(p - left);
                pb = Math.abs(p - upper);
                pc = Math.abs(p - upperLeft);
                if (pa <= pb && pa <= pc) {
                  paeth = left;
                } else if (pb <= pc) {
                  paeth = upper;
                } else {
                  paeth = upperLeft;
                }
                pixels[c++] = (byte + paeth) % 256;
              }
              break;
            default:
              throw new Error("Invalid filter algorithm: " + data[pos - 1]);
          }
          row++;
        }
        return fn(pixels);
      });
    };

    PNG.prototype.decodePalette = function() {
      var c, i, length, palette, pos, ret, transparency, _i, _ref, _ref1;
      palette = this.palette;
      transparency = this.transparency.indexed || [];
      ret = new Buffer(transparency.length + palette.length);
      pos = 0;
      length = palette.length;
      c = 0;
      for (i = _i = 0, _ref = palette.length; _i < _ref; i = _i += 3) {
        ret[pos++] = palette[i];
        ret[pos++] = palette[i + 1];
        ret[pos++] = palette[i + 2];
        ret[pos++] = (_ref1 = transparency[c++]) != null ? _ref1 : 255;
      }
      return ret;
    };

    PNG.prototype.copyToImageData = function(imageData, pixels) {
      var alpha, colors, data, i, input, j, k, length, palette, v, _ref;
      colors = this.colors;
      palette = null;
      alpha = this.hasAlphaChannel;
      if (this.palette.length) {
        palette = (_ref = this._decodedPalette) != null ? _ref : this._decodedPalette = this.decodePalette();
        colors = 4;
        alpha = true;
      }
      data = (imageData != null ? imageData.data : void 0) || imageData;
      length = data.length;
      input = palette || pixels;
      i = j = 0;
      if (colors === 1) {
        while (i < length) {
          k = palette ? pixels[i / 4] * 4 : j;
          v = input[k++];
          data[i++] = v;
          data[i++] = v;
          data[i++] = v;
          data[i++] = alpha ? input[k++] : 255;
          j = k;
        }
      } else {
        while (i < length) {
          k = palette ? pixels[i / 4] * 4 : j;
          data[i++] = input[k++];
          data[i++] = input[k++];
          data[i++] = input[k++];
          data[i++] = alpha ? input[k++] : 255;
          j = k;
        }
      }
    };

    PNG.prototype.decode = function(fn) {
      var ret,
        _this = this;
      ret = new Buffer(this.width * this.height * 4);
      return this.decodePixels(function(pixels) {
        _this.copyToImageData(ret, pixels);
        return fn(ret);
      });
    };

    return PNG;

  })();

}).call(this);

}).call(this,_dereq_("buffer").Buffer)
},{"buffer":1,"fs":"x/K9gc","zlib":15}],56:[function(_dereq_,module,exports){
(function (Buffer){
/* jslint node: true */
/* jslint browser: true */
/* global saveAs */
/* global BlobBuilder */
'use strict';

var PdfPrinter = _dereq_('../printer');

var defaultClientFonts = {
	Roboto: {
		normal: 'Roboto-Regular.ttf',
		bold: 'Roboto-Medium.ttf',
		italics: 'Roboto-Italic.ttf',
		bolditalics: 'Roboto-Italic.ttf'
	}
};

function Document(docDefinition, fonts, vfs) {
	this.docDefinition = docDefinition;
	this.fonts = fonts || defaultClientFonts;
	this.vfs = vfs;
}

Document.prototype._createDoc = function(options, callback) {
	var printer = new PdfPrinter(this.fonts);
	printer.fs.bindFS(this.vfs);

	var doc = printer.createPdfKitDocument(this.docDefinition, options);
	var chunks = [];
	var result;

	doc.on('data', function(chunk) {
		chunks.push(chunk);
	});
	doc.on('end', function() {
		result = Buffer.concat(chunks);
		callback(result);
	});
	doc.end();
};

Document.prototype.open = function(message) {
	// we have to open the window immediately and store the reference
	// otherwise popup blockers will stop us
	var win = window.open('', '_blank');

	try {
		this.getDataUrl(function(result) {
			win.location.href = result;
		});
	} catch(e) {
		win.close();
		return false;
	}
};


Document.prototype.print = function(timeout) {
	timeout = timeout || 2000;

	this.getDataUrl(function(dataUrl) {
		var iFrame = document.createElement('iframe');
		iFrame.style.display = 'none';
		iFrame.src = dataUrl;
		iFrame.onload = function() {
			setTimeout(function() {
				document.body.removeChild(iFrame);
			}, timeout);
		};

		document.body.appendChild(iFrame);
	}, { autoPrint: true });
};

Document.prototype.download = function(defaultFileName) {
	defaultFileName = defaultFileName || 'file.pdf';
	this.getBuffer(function(result) {
		saveAs(new Blob([result], {type: 'application/pdf'}), defaultFileName);
	});
};

Document.prototype.getBase64 = function(cb, options) {
	if (!cb) throw 'getBase64 is an async method and needs a callback argument';
	this._createDoc(options, function(buffer) {
		cb(buffer.toString('base64'));
	});
};

Document.prototype.getDataUrl = function(cb, options) {
	if (!cb) throw 'getDataUrl is an async method and needs a callback argument';
	this._createDoc(options, function(buffer) {
		cb('data:application/pdf;base64,' + buffer.toString('base64'));
	});
};

Document.prototype.getBuffer = function(cb, options) {
	if (!cb) throw 'getBuffer is an async method and needs a callback argument';
	this._createDoc(options, cb);
};

module.exports = {
	createPdf: function(docDefinition) {
		return new Document(docDefinition, window.pdfMake.fonts, window.pdfMake.vfs);
	}
};

}).call(this,_dereq_("buffer").Buffer)
},{"../printer":68,"buffer":1}],"fs":[function(_dereq_,module,exports){
module.exports=_dereq_('x/K9gc');
},{}],"x/K9gc":[function(_dereq_,module,exports){
(function (Buffer,__dirname){
/* jslint node: true */
'use strict';

// var b64 = require('./base64.js').base64DecToArr;
function VirtualFileSystem() {
	this.fileSystem = {};
	this.baseSystem = {};
}

VirtualFileSystem.prototype.readFileSync = function(filename) {
	filename = fixFilename(filename);

	var base64content = this.baseSystem[filename];
	if (base64content) {
		return new Buffer(base64content, 'base64');
	}

	return this.fileSystem[filename];
};

VirtualFileSystem.prototype.writeFileSync = function(filename, content) {
	this.fileSystem[fixFilename(filename)] = content;
};

VirtualFileSystem.prototype.bindFS = function(data) {
	this.baseSystem = data;
};


function fixFilename(filename) {
	if (filename.indexOf(__dirname) === 0) {
		filename = filename.substring(__dirname.length);
	}

	if (filename.indexOf('/') === 0) {
		filename = filename.substring(1);
	}

	return filename;
}

module.exports = new VirtualFileSystem();

}).call(this,_dereq_("buffer").Buffer,"/")
},{"buffer":1}],59:[function(_dereq_,module,exports){
/* jslint node: true */
'use strict';

function buildColumnWidths(columns, availableWidth) {
	var autoColumns = [],
		autoMin = 0, autoMax = 0,
		starColumns = [],
		starMaxMin = 0,
		starMaxMax = 0,
		fixedColumns = [];

	columns.forEach(function(column) {
		if (isAutoColumn(column)) {
			autoColumns.push(column);
			autoMin += column._minWidth;
			autoMax += column._maxWidth;
		} else if (isStarColumn(column)) {
			starColumns.push(column);
			starMaxMin = Math.max(starMaxMin, column._minWidth);
			starMaxMax = Math.max(starMaxMax, column._maxWidth);
		} else {
			fixedColumns.push(column);
		}
	});

	fixedColumns.forEach(function(col) {
		if (col.width < (col._minWidth) && col.elasticWidth) {
			col._calcWidth = col._minWidth;
		} else {
			col._calcWidth = col.width;
		}

		availableWidth -= col._calcWidth;
	});

	// http://www.freesoft.org/CIE/RFC/1942/18.htm
	// http://www.w3.org/TR/CSS2/tables.html#width-layout
	// http://dev.w3.org/csswg/css3-tables-algorithms/Overview.src.htm
	var minW = autoMin + starMaxMin * starColumns.length;
	var maxW = autoMax + starMaxMax * starColumns.length;
	if (minW >= availableWidth) {
		// case 1 - there's no way to fit all columns within available width
		// that's actually pretty bad situation with PDF as we have no horizontal scroll
		// no easy workaround (unless we decide, in the future, to split single words)
		// currently we simply use minWidths for all columns
		autoColumns.forEach(function(col) {
			col._calcWidth = col._minWidth;
		});

		starColumns.forEach(function(col) {
			col._calcWidth = starMaxMin; // starMaxMin already contains padding
		});
	} else {
		if (maxW < availableWidth) {
			// case 2 - we can fit rest of the table within available space
			autoColumns.forEach(function(col) {
				col._calcWidth = col._maxWidth;
				availableWidth -= col._calcWidth;
			});
		} else {
			// maxW is too large, but minW fits within available width
			var W = availableWidth - minW;
			var D = maxW - minW;

			autoColumns.forEach(function(col) {
				var d = col._maxWidth - col._minWidth;
				col._calcWidth = col._minWidth + d * W / D;
				availableWidth -= col._calcWidth;
			});
		}

		if (starColumns.length > 0) {
			var starSize = availableWidth / starColumns.length;

			starColumns.forEach(function(col) {
				col._calcWidth = starSize;
			});
		}
	}
}

function isAutoColumn(column) {
	return column.width === 'auto';
}

function isStarColumn(column) {
	return column.width === null || column.width === undefined || column.width === '*' || column.width === 'star';
}

//TODO: refactor and reuse in measureTable
function measureMinMax(columns) {
	var result = { min: 0, max: 0 };

	var maxStar = { min: 0, max: 0 };
	var starCount = 0;

	for(var i = 0, l = columns.length; i < l; i++) {
		var c = columns[i];

		if (isStarColumn(c)) {
			maxStar.min = Math.max(maxStar.min, c._minWidth);
			maxStar.max = Math.max(maxStar.max, c._maxWidth);
			starCount++;
		} else if (isAutoColumn(c)) {
			result.min += c._minWidth;
			result.max += c._maxWidth;
		} else {
			result.min += ((c.width !== undefined && c.width) || c._minWidth);
			result.max += ((c.width  !== undefined && c.width) || c._maxWidth);
		}
	}

	if (starCount) {
		result.min += starCount * maxStar.min;
		result.max += starCount * maxStar.max;
	}

	return result;
}

/**
* Calculates column widths
* @private
*/
module.exports = {
	buildColumnWidths: buildColumnWidths,
	measureMinMax: measureMinMax,
	isAutoColumn: isAutoColumn,
	isStarColumn: isStarColumn
};

},{}],60:[function(_dereq_,module,exports){
/* jslint node: true */
'use strict';

var TextTools = _dereq_('./textTools');
var StyleContextStack = _dereq_('./styleContextStack');
var ColumnCalculator = _dereq_('./columnCalculator');
var fontStringify = _dereq_('./helpers').fontStringify;
var pack = _dereq_('./helpers').pack;

/**
* @private
*/
function DocMeasure(fontProvider, styleDictionary, defaultStyle, imageMeasure, tableLayouts, images) {
	this.textTools = new TextTools(fontProvider);
	this.styleStack = new StyleContextStack(styleDictionary, defaultStyle);
	this.imageMeasure = imageMeasure;
	this.tableLayouts = tableLayouts;
	this.images = images;
	this.autoImageIndex = 1;
}

/**
* Measures all nodes and sets min/max-width properties required for the second
* layout-pass.
* @param  {Object} docStructure document-definition-object
* @return {Object}              document-measurement-object
*/
DocMeasure.prototype.measureDocument = function(docStructure) {
	return this.measureNode(docStructure);
};

DocMeasure.prototype.measureNode = function(node) {
	// expand shortcuts
	if (node instanceof Array) {
		node = { stack: node };
	} else if (typeof node == 'string' || node instanceof String) {
		node = { text: node };
	}

	var self = this;

	return this.styleStack.auto(node, function() {
		// TODO: refactor + rethink whether this is the proper way to handle margins
		node._margin = getNodeMargin(node);

		if (node.columns) {
			return extendMargins(self.measureColumns(node));
		} else if (node.stack) {
			return extendMargins(self.measureVerticalContainer(node));
		} else if (node.ul) {
			return extendMargins(self.measureList(false, node));
		} else if (node.ol) {
			return extendMargins(self.measureList(true, node));
		} else if (node.table) {
			return extendMargins(self.measureTable(node));
		} else if (node.text !== undefined) {
			return extendMargins(self.measureLeaf(node));
		} else if (node.image) {
			return extendMargins(self.measureImage(node));
		} else if (node.canvas) {
			return extendMargins(self.measureCanvas(node));
		} else {
			throw 'Unrecognized document structure: ' + JSON.stringify(node, fontStringify);
		}
	});

	function extendMargins(node) {
		var margin = node._margin;

		if (margin) {
			node._minWidth += margin[0] + margin[2];
			node._maxWidth += margin[0] + margin[2];
		}

		return node;
	}

	function getNodeMargin() {
		var margin = node.margin;

		if (!margin && node.style) {
			var styleArray = (node.style instanceof Array) ? node.style : [ node.style ];

			for(var i = styleArray.length - 1; i >= 0; i--) {
				var styleName = styleArray[i];
				var style = self.styleStack.styleDictionary[node.style];
				if (style && style.margin) {
					margin = style.margin;
					break;
				}
			}
		}

		if (!margin) return null;

		if (typeof margin === 'number' || margin instanceof Number) {
			margin = [ margin, margin, margin, margin ];
		} else if (margin instanceof Array) {
			if (margin.length === 2) {
				margin = [ margin[0], margin[1], margin[0], margin[1] ];
			}
		}

		return margin;
	}
};

DocMeasure.prototype.convertIfBase64Image = function(node) {
	if (/^data:image\/(jpeg|jpg|png);base64,/.test(node.image)) {
		var label = '$$pdfmake$$' + this.autoImageIndex++;
		this.images[label] = node.image;
		node.image = label;
}
};

DocMeasure.prototype.measureImage = function(node) {
	if (this.images) {
		this.convertIfBase64Image(node);
	}

	var imageSize = this.imageMeasure.measureImage(node.image);

	if (node.fit) {
		var factor = (imageSize.width / imageSize.height > node.fit[0] / node.fit[1]) ? node.fit[0] / imageSize.width : node.fit[1] / imageSize.height;
		node._width = node._minWidth = node._maxWidth = imageSize.width * factor;
		node._height = imageSize.height * factor;
	} else {
		node._width = node._minWidth = node._maxWidth = node.width || imageSize.width;
		node._height = node.height || (imageSize.height * node._width / imageSize.width);
	}

	node._alignment = this.styleStack.getProperty('alignment');
	return node;
};

DocMeasure.prototype.measureLeaf = function(node) {
	var data = this.textTools.buildInlines(node.text, this.styleStack);

	node._inlines = data.items;
	node._minWidth = data.minWidth;
	node._maxWidth = data.maxWidth;

	return node;
};

DocMeasure.prototype.measureVerticalContainer = function(node) {
	var items = node.stack;

	node._minWidth = 0;
	node._maxWidth = 0;

	for(var i = 0, l = items.length; i < l; i++) {
		items[i] = this.measureNode(items[i]);

		node._minWidth = Math.max(node._minWidth, items[i]._minWidth);
		node._maxWidth = Math.max(node._maxWidth, items[i]._maxWidth);
	}

	return node;
};

DocMeasure.prototype.gapSizeForList = function(isOrderedList, listItems) {
	if (isOrderedList) {
		var longestNo = (listItems.length).toString().replace(/./g, '9');
		return this.textTools.sizeOfString(longestNo + '. ', this.styleStack);
	} else {
		return this.textTools.sizeOfString('9. ', this.styleStack);
	}
};

DocMeasure.prototype.buildMarker = function(isOrderedList, counter, styleStack, gapSize) {
	var marker;

	if (isOrderedList) {
		marker = { _inlines: this.textTools.buildInlines(counter, styleStack).items };
	}
	else {
		// TODO: ascender-based calculations
		var radius = gapSize.fontSize / 6;

		marker = {
			canvas: [ {
				x: radius,
				y: gapSize.height + gapSize.decender - gapSize.fontSize / 3,//0,// gapSize.fontSize * 2 / 3,
				r1: radius,
				r2: radius,
				type: 'ellipse',
				color: 'black'
			} ]
		};
	}

	marker._minWidth = marker._maxWidth = gapSize.width;
	marker._minHeight = marker._maxHeight = gapSize.height;

	return marker;
};

DocMeasure.prototype.measureList = function(isOrdered, node) {
	var style = this.styleStack.clone();

	var items = isOrdered ? node.ol : node.ul;
	node._gapSize = this.gapSizeForList(isOrdered, items);
	node._minWidth = 0;
	node._maxWidth = 0;

	var counter = 1;

	for(var i = 0, l = items.length; i < l; i++) {
		var nextItem = items[i] = this.measureNode(items[i]);

		var marker = counter++ + '. ';

		if (!nextItem.ol && !nextItem.ul) {
			nextItem.listMarker = this.buildMarker(isOrdered, nextItem.counter || marker, style, node._gapSize);
		}  // TODO: else - nested lists numbering

		node._minWidth = Math.max(node._minWidth, items[i]._minWidth + node._gapSize.width);
		node._maxWidth = Math.max(node._maxWidth, items[i]._maxWidth + node._gapSize.width);
	}

	return node;
};

DocMeasure.prototype.measureColumns = function(node) {
	var columns = node.columns;
	node._gap = this.styleStack.getProperty('columnGap') || 0;

	for(var i = 0, l = columns.length; i < l; i++) {
		columns[i] = this.measureNode(columns[i]);
	}

	var measures = ColumnCalculator.measureMinMax(columns);

	node._minWidth = measures.min + node._gap * (columns.length - 1);
	node._maxWidth = measures.max + node._gap * (columns.length - 1);

	return node;
};

DocMeasure.prototype.measureTable = function(node) {
	extendTableWidths(node);
	node._layout = getLayout(this.tableLayouts);
	node._offsets = getOffsets(node._layout);

	var colSpans = [];
	var col, row, cols, rows;

	for(col = 0, cols = node.table.body[0].length; col < cols; col++) {
		var c = node.table.widths[col];
		c._minWidth = 0;
		c._maxWidth = 0;

		for(row = 0, rows = node.table.body.length; row < rows; row++) {
			var rowData = node.table.body[row];
			var data = rowData[col];
			if (!data._span) {
				data = rowData[col] = this.measureNode(data);

				if (data.colSpan && data.colSpan > 1) {
					markSpans(rowData, col, data.colSpan);
					colSpans.push({ col: col, span: data.colSpan, minWidth: data._minWidth, maxWidth: data._maxWidth });
				} else {
					c._minWidth = Math.max(c._minWidth, data._minWidth);
					c._maxWidth = Math.max(c._maxWidth, data._maxWidth);
				}
			}

			if (data.rowSpan && data.rowSpan > 1) {
				markVSpans(node.table, row, col, data.rowSpan);
			}
		}
	}

	extendWidthsForColSpans();

	var measures = ColumnCalculator.measureMinMax(node.table.widths);

	node._minWidth = measures.min + node._offsets.total;
	node._maxWidth = measures.max + node._offsets.total;

	return node;

	function getLayout(tableLayouts) {
		var layout = node.layout;

		if (typeof node.layout === 'string' || node instanceof String) {
			layout = tableLayouts[layout];
		}

		var defaultLayout = {
			hLineWidth: function(i, node) { return 1; }, //return node.table.headerRows && i === node.table.headerRows && 3 || 0; },
			vLineWidth: function(i, node) { return 1; },
			hLineColor: function(i, node) { return 'black'; },
			vLineColor: function(i, node) { return 'black'; },
			paddingLeft: function(i, node) { return 4; }, //i && 4 || 0; },
			paddingRight: function(i, node) { return 4; }, //(i < node.table.widths.length - 1) ? 4 : 0; },
			paddingTop: function(i, node) { return 2; },
			paddingBottom: function(i, node) { return 2; }
		};

		return pack(defaultLayout, layout);
	}

	function getOffsets(layout) {
		var offsets = [];
		var totalOffset = 0;
		var prevRightPadding = 0;

		for(var i = 0, l = node.table.widths.length; i < l; i++) {
			var lOffset = prevRightPadding + layout.vLineWidth(i, node) + layout.paddingLeft(i, node);
			offsets.push(lOffset);
			totalOffset += lOffset;
			prevRightPadding = layout.paddingRight(i, node);
		}

		totalOffset += prevRightPadding + layout.vLineWidth(node.table.widths.length, node);

		return {
			total: totalOffset,
			offsets: offsets
		};
	}

	function extendWidthsForColSpans() {
		var q, j;

		for (var i = 0, l = colSpans.length; i < l; i++) {
			var span = colSpans[i];

			var currentMinMax = getMinMax(span.col, span.span, node._offsets);
			var minDifference = span.minWidth - currentMinMax.minWidth;
			var maxDifference = span.maxWidth - currentMinMax.maxWidth;

			if (minDifference > 0) {
				q = minDifference / span.span;

				for(j = 0; j < span.span; j++) {
					node.table.widths[span.col + j]._minWidth += q;
				}
			}

			if (maxDifference > 0) {
				q = maxDifference / span.span;

				for(j = 0; j < span.span; j++) {
					node.table.widths[span.col + j]._maxWidth += q;
				}
			}
		}
	}

	function getMinMax(col, span, offsets) {
		var result = { minWidth: 0, maxWidth: 0 };

		for(var i = 0; i < span; i++) {
			result.minWidth += node.table.widths[col + i]._minWidth + (i? offsets.offsets[col + i] : 0);
			result.maxWidth += node.table.widths[col + i]._maxWidth + (i? offsets.offsets[col + i] : 0);
		}

		return result;
	}

	function markSpans(rowData, col, span) {
		for (var i = 1; i < span; i++) {
			rowData[col + i] = {
				_span: true,
				_minWidth: 0,
				_maxWidth: 0,
				rowSpan: rowData[col].rowSpan
			};
		}
	}

	function markVSpans(table, row, col, span) {
		for (var i = 1; i < span; i++) {
			table.body[row + i][col] = {
				_span: true,
				_minWidth: 0,
				_maxWidth: 0,
			};
		}
	}

	function extendTableWidths(node) {
		if (!node.table.widths) {
			node.table.widths = 'auto';
		}

		if (typeof node.table.widths === 'string' || node.table.widths instanceof String) {
			node.table.widths = [ node.table.widths ];

			while(node.table.widths.length < node.table.body[0].length) {
				node.table.widths.push(node.table.widths[node.table.widths.length - 1]);
			}
		}

		for(var i = 0, l = node.table.widths.length; i < l; i++) {
			var w = node.table.widths[i];
			if (typeof w === 'number' || w instanceof Number || typeof w === 'string' || w instanceof String) {
				node.table.widths[i] = { width: w };
			}
		}
	}
};

DocMeasure.prototype.measureCanvas = function(node) {
	var w = 0, h = 0;

	for(var i = 0, l = node.canvas.length; i < l; i++) {
		var vector = node.canvas[i];

		switch(vector.type) {
		case 'ellipse':
			w = Math.max(w, vector.x + vector.r1);
			h = Math.max(h, vector.y + vector.r2);
			break;
		case 'rect':
			w = Math.max(w, vector.x + vector.w);
			h = Math.max(h, vector.y + vector.h);
			break;
		case 'line':
			w = Math.max(w, vector.x1, vector.x2);
			h = Math.max(h, vector.y1, vector.y2);
			break;
		case 'polyline':
			for(var i2 = 0, l2 = vector.points.length; i2 < l2; i2++) {
				w = Math.max(w, vector.points[i2].x);
				h = Math.max(h, vector.points[i2].y);
			}
			break;
		}
	}

	node._minWidth = node._maxWidth = w;
	node._minHeight = node._maxHeight = h;

	return node;
};

module.exports = DocMeasure;

},{"./columnCalculator":59,"./helpers":63,"./styleContextStack":70,"./textTools":72}],61:[function(_dereq_,module,exports){
/* jslint node: true */
'use strict';

/**
* Creates an instance of DocumentContext - a store for current x, y positions and available width/height.
* It facilitates column divisions and vertical sync
*/
function DocumentContext(pageSize, pageMargins) {
	this.pages = [];

	this.pageSize = pageSize;
	this.pageMargins = pageMargins;

	this.x = pageMargins.left;
	this.availableWidth = pageSize.width - pageMargins.left - pageMargins.right;
	this.availableHeight = 0;
	this.page = -1;

	this.snapshots = [];

	this.endingCell = null;

	this.addPage();
}

DocumentContext.prototype.beginColumnGroup = function() {
	this.snapshots.push({
		x: this.x,
		y: this.y,
		availableHeight: this.availableHeight,
		availableWidth: this.availableWidth,
		page: this.page,
		bottomMost: { y: this.y, page: this.page },
		endingCell: this.endingCell,
		lastColumnWidth: this.lastColumnWidth
	});

	this.lastColumnWidth = 0;
};

DocumentContext.prototype.beginColumn = function(width, offset, endingCell) {
	var saved = this.snapshots[this.snapshots.length - 1];

	this.calculateBottomMost(saved);

  this.endingCell = endingCell;
	this.page = saved.page;
	this.x = this.x + this.lastColumnWidth + (offset || 0);
	this.y = saved.y;
	this.availableWidth = width;	//saved.availableWidth - offset;
	this.availableHeight = saved.availableHeight;

	this.lastColumnWidth = width;
};

DocumentContext.prototype.calculateBottomMost = function(destContext) {
	if (this.endingCell) {
		this.saveContextInEndingCell(this.endingCell);
		this.endingCell = null;
	} else {
		destContext.bottomMost = bottomMostContext(this, destContext.bottomMost);
	}
};

DocumentContext.prototype.markEnding = function(endingCell) {
	this.page = endingCell._columnEndingContext.page;
	this.x = endingCell._columnEndingContext.x;
	this.y = endingCell._columnEndingContext.y;
	this.availableWidth = endingCell._columnEndingContext.availableWidth;
	this.availableHeight = endingCell._columnEndingContext.availableHeight;
	this.lastColumnWidth = endingCell._columnEndingContext.lastColumnWidth;
};

DocumentContext.prototype.saveContextInEndingCell = function(endingCell) {
	endingCell._columnEndingContext = {
		page: this.page,
		x: this.x,
		y: this.y,
		availableHeight: this.availableHeight,
		availableWidth: this.availableWidth,
		lastColumnWidth: this.lastColumnWidth
	};
};

DocumentContext.prototype.completeColumnGroup = function() {
	var saved = this.snapshots.pop();

	this.calculateBottomMost(saved);

	this.endingCell = null;
	this.x = saved.x;
	this.y = saved.bottomMost.y;
	this.page = saved.bottomMost.page;
	this.availableWidth = saved.availableWidth;
	this.availableHeight = saved.bottomMost.availableHeight;
	this.lastColumnWidth = saved.lastColumnWidth;
};

DocumentContext.prototype.addMargin = function(left, right) {
	this.x += left;
	this.availableWidth -= left + (right || 0);
};

DocumentContext.prototype.moveDown = function(offset) {
	this.y += offset;
	this.availableHeight -= offset;

	return this.availableHeight > 0;
};

DocumentContext.prototype.moveToPageTop = function() {
	this.y = this.pageMargins.top;
	this.availableHeight = this.pageSize.height - this.pageMargins.top - this.pageMargins.bottom;
};

DocumentContext.prototype.addPage = function() {
	var page = { lines: [], vectors: [], images: [] };
	this.pages.push(page);
	this.page = this.pages.length - 1;
	this.moveToPageTop();

	return page;
};

DocumentContext.prototype.getCurrentPage = function() {
	if (this.page < 0 || this.page >= this.pages.length) return null;

	return this.pages[this.page];
};

function bottomMostContext(c1, c2) {
	var r;

	if (c1.page > c2.page) r = c1;
	else if (c2.page > c1.page) r = c2;
	else r = (c1.y > c2.y) ? c1 : c2;

	return {
		page: r.page,
		x: r.x,
		y: r.y,
		availableHeight: r.availableHeight,
		availableWidth: r.availableWidth
	};
}

/****TESTS**** (add a leading '/' to uncomment)
DocumentContext.bottomMostContext = bottomMostContext;
// */

module.exports = DocumentContext;

},{}],62:[function(_dereq_,module,exports){
/* jslint node: true */
'use strict';

var Line = _dereq_('./line');
var pack = _dereq_('./helpers').pack;
var offsetVector = _dereq_('./helpers').offsetVector;
var DocumentContext = _dereq_('./documentContext');

/**
* Creates an instance of ElementWriter - a line/vector writer, which adds
* elements to current page and sets their positions based on the context
*/
function ElementWriter(context, tracker) {
	this.context = context;
	this.contextStack = [];
	this.tracker = tracker || { emit: function() { } };
}

ElementWriter.prototype.addLine = function(line, dontUpdateContextPosition) {
	var height = line.getHeight();
	var context = this.context;
	var page = context.getCurrentPage();

	if (context.availableHeight < height || !page) {
		return false;
	}

	line.x = context.x + (line.x || 0);
	line.y = context.y + (line.y || 0);

	this.alignLine(line);

	page.lines.push(line);
	this.tracker.emit('lineAdded', line);

	if (!dontUpdateContextPosition) context.moveDown(height);

	return true;
};

ElementWriter.prototype.alignLine = function(line) {
	var width = this.context.availableWidth;
	var lineWidth = line.getWidth();

	var alignment = line.inlines && line.inlines.length > 0 && line.inlines[0].alignment;

	var offset = 0;
	switch(alignment) {
		case 'right':
			offset = width - lineWidth;
			break;
		case 'center':
			offset = (width - lineWidth) / 2;
			break;
	}

	if (offset) {
		line.x = (line.x || 0) + offset;
	}

	if (alignment === 'justify' &&
		!line.newLineForced &&
		!line.lastLineInParagraph &&
		line.inlines.length > 1) {
		var additionalSpacing = (width - lineWidth) / (line.inlines.length - 1);

		for(var i = 1, l = line.inlines.length; i < l; i++) {
			offset = i * additionalSpacing;

			line.inlines[i].x += offset;
		}
	}
};

ElementWriter.prototype.addImage = function(image) {
	var context = this.context;
	var page = context.getCurrentPage();

	if (context.availableHeight < image._height || !page) {
		return false;
	}

	image.x = context.x + (image.x || 0);
	image.y = context.y;

	this.alignImage(image);

	page.images.push(image);

	context.moveDown(image._height);

	return true;
};

ElementWriter.prototype.alignImage = function(image) {
	var width = this.context.availableWidth;
	var imageWidth = image._minWidth;
	var offset = 0;

	switch(image._alignment) {
		case 'right':
			offset = width - imageWidth;
			break;
		case 'center':
			offset = (width - imageWidth) / 2;
			break;
	}

	if (offset) {
		image.x = (image.x || 0) + offset;
	}
};

ElementWriter.prototype.addVector = function(vector, ignoreContextX, ignoreContextY) {
	var context = this.context;
	var page = context.getCurrentPage();

	if (page) {
		offsetVector(vector, ignoreContextX ? 0 : context.x, ignoreContextY ? 0 : context.y);
		page.vectors.push(vector);

		return true;
	}
};

function cloneLine(line) {
	var result = new Line(line.maxWidth);

	for(var key in line) {
		if (line.hasOwnProperty(key)) {
			result[key] = line[key];
		}
	}

	return result;
}

ElementWriter.prototype.addFragment = function(block, useBlockXOffset, useBlockYOffset, dontUpdateContextPosition) {
	var ctx = this.context;
	var page = ctx.getCurrentPage();

	if (block.height > ctx.availableHeight) return false;

	block.lines.forEach(function(line) {
		var l = cloneLine(line);

		l.x = (l.x || 0) + (useBlockXOffset ? (block.xOffset || 0) : ctx.x);
		l.y = (l.y || 0) + (useBlockYOffset ? (block.yOffset || 0) : ctx.y);

		page.lines.push(l);
	});

	block.vectors.forEach(function(vector) {
		var v = pack(vector);

		offsetVector(v, useBlockXOffset ? (block.xOffset || 0) : ctx.x, useBlockYOffset ? (block.yOffset || 0) : ctx.y);
		page.vectors.push(v);
	});

	block.images.forEach(function(image) {
		var img = pack(image);

		img.x = (img.x || 0) + (useBlockXOffset ? (block.xOffset || 0) : ctx.x);
		img.y = (img.y || 0) + (useBlockYOffset ? (block.yOffset || 0) : ctx.y);

		page.images.push(img);
	});

	if (!dontUpdateContextPosition) ctx.moveDown(block.height);

	return true;
};

/**
* Pushes the provided context onto the stack or creates a new one
*
* pushContext(context) - pushes the provided context and makes it current
* pushContext(width, height) - creates and pushes a new context with the specified width and height
* pushContext() - creates a new context for unbreakable blocks (with current availableWidth and full-page-height)
*/
ElementWriter.prototype.pushContext = function(contextOrWidth, height) {
	if (contextOrWidth === undefined) {
		height = this.context.pageSize.height - this.context.pageMargins.top - this.context.pageMargins.bottom;
		contextOrWidth = this.context.availableWidth;
	}

	if (typeof contextOrWidth === 'number' || contextOrWidth instanceof Number) {
		contextOrWidth = new DocumentContext({ width: contextOrWidth, height: height }, { left: 0, right: 0, top: 0, bottom: 0 });
	}

	this.contextStack.push(this.context);
	this.context = contextOrWidth;
};

ElementWriter.prototype.popContext = function() {
	this.context = this.contextStack.pop();
};


module.exports = ElementWriter;

},{"./documentContext":61,"./helpers":63,"./line":66}],63:[function(_dereq_,module,exports){
/* jslint node: true */
'use strict';

function pack() {
	var result = {};

	for(var i = 0, l = arguments.length; i < l; i++) {
		var obj = arguments[i];

		if (obj) {
			for(var key in obj) {
				if (obj.hasOwnProperty(key)) {
					result[key] = obj[key];
				}
			}
		}
	}

	return result;
}

function offsetVector(vector, x, y) {
	switch(vector.type) {
	case 'ellipse':
	case 'rect':
		vector.x += x;
		vector.y += y;
		break;
	case 'line':
		vector.x1 += x;
		vector.x2 += x;
		vector.y1 += y;
		vector.y2 += y;
		break;
	case 'polyline':
		for(var i = 0, l = vector.points.length; i < l; i++) {
			vector.points[i].x += x;
			vector.points[i].y += y;
		}
		break;
	}
}

function fontStringify(key, val) {
	if (key === 'font') {
		return 'font';
	}
	return val;
}

function isFunction(functionToCheck) {
	var getType = {};
	return functionToCheck && getType.toString.call(functionToCheck) === '[object Function]';
}


module.exports = {
	pack: pack,
	fontStringify: fontStringify,
	offsetVector: offsetVector,
	isFunction: isFunction
};

},{}],64:[function(_dereq_,module,exports){
(function (Buffer){
var pdfKit = _dereq_('pdfmake-pdfkit');

function ImageMeasure(pdfDoc, imageDictionary) {
	this.pdfDoc = pdfDoc;
	this.imageDictionary = imageDictionary || {};
}

ImageMeasure.prototype.measureImage = function(src) {
	var image, label;
	var that = this;

	if (!this.pdfDoc._imageRegistry[src]) {
		label = "I" + (++this.pdfDoc._imageCount);
		image = pdfKit.PDFImage.open(realImageSrc(src), label);
		image.embed(this.pdfDoc);
		this.pdfDoc._imageRegistry[src] = image;
	} else {
		image = this.pdfDoc._imageRegistry[src];
	}

	return { width: image.width, height: image.height };

	function realImageSrc(src) {
		var img = that.imageDictionary[src];

		if (!img) return src;

		var index = img.indexOf('base64,');
		if (index < 0) {
			throw 'invalid image format, images dictionary should contain dataURL entries';
		}

		return new Buffer(img.substring(index + 7), 'base64');
	}
};

module.exports = ImageMeasure;

}).call(this,_dereq_("buffer").Buffer)
},{"buffer":1,"pdfmake-pdfkit":18}],65:[function(_dereq_,module,exports){
/* jslint node: true */
'use strict';

var TraversalTracker = _dereq_('./traversalTracker');
var DocMeasure = _dereq_('./docMeasure');
var DocumentContext = _dereq_('./documentContext');
var PageElementWriter = _dereq_('./pageElementWriter');
var ColumnCalculator = _dereq_('./columnCalculator');
var TableProcessor = _dereq_('./tableProcessor');
var Line = _dereq_('./line');
var pack = _dereq_('./helpers').pack;
var offsetVector = _dereq_('./helpers').offsetVector;
var fontStringify = _dereq_('./helpers').fontStringify;
var isFunction = _dereq_('./helpers').isFunction;

/**
 * Creates an instance of LayoutBuilder - layout engine which turns document-definition-object
 * into a set of pages, lines, inlines and vectors ready to be rendered into a PDF
 *
 * @param {Object} pageSize - an object defining page width and height
 * @param {Object} pageMargins - an object defining top, left, right and bottom margins
 */
function LayoutBuilder(pageSize, pageMargins, imageMeasure) {
	this.pageSize = pageSize;
	this.pageMargins = pageMargins;
	this.tracker = new TraversalTracker();
    this.imageMeasure = imageMeasure;
    this.tableLayouts = {};
}

LayoutBuilder.prototype.registerTableLayouts = function (tableLayouts) {
  this.tableLayouts = pack(this.tableLayouts, tableLayouts);
};

/**
 * Executes layout engine on document-definition-object and creates an array of pages
 * containing positioned Blocks, Lines and inlines
 *
 * @param {Object} docStructure document-definition-object
 * @param {Object} fontProvider font provider
 * @param {Object} styleDictionary dictionary with style definitions
 * @param {Object} defaultStyle default style definition
 * @return {Array} an array of pages
 */
LayoutBuilder.prototype.layoutDocument = function (docStructure, fontProvider, styleDictionary, defaultStyle, header, footer, images) {
	this.docMeasure = new DocMeasure(fontProvider, styleDictionary, defaultStyle, this.imageMeasure, this.tableLayouts, images);

  docStructure = this.docMeasure.measureDocument(docStructure);

  this.writer = new PageElementWriter(
    new DocumentContext(this.pageSize, this.pageMargins), this.tracker);

  this.processNode(docStructure);
  this.addHeadersAndFooters(header, footer);

	return this.writer.context().pages;
};

LayoutBuilder.prototype.addHeadersAndFooters = function(header, footer) {
  var pages = this.writer.context().pages;
  var headerGetter = isFunction(header) ? header : function() { return header; };
  var footerGetter = isFunction(footer) ? footer : function() { return footer; };

  for(var i = 0, l = pages.length; i < l; i++) {
    this.writer.context().page = i;

    var pageHeader = headerGetter(i + 1, l);
    var pageFooter = footerGetter(i + 1, l);

    if (pageHeader) {
      this.writer.beginUnbreakableBlock(this.pageSize.width, this.pageMargins.top);
      this.processNode(this.docMeasure.measureDocument(pageHeader));
      this.writer.commitUnbreakableBlock(0, 0);
    }

    if (pageFooter) {
      this.writer.beginUnbreakableBlock(this.pageSize.width, this.pageMargins.bottom);
      this.processNode(this.docMeasure.measureDocument(pageFooter));
      this.writer.commitUnbreakableBlock(0, this.pageSize.height - this.pageMargins.bottom);
    }
  }
};

LayoutBuilder.prototype.processNode = function(node) {
  var self = this;

  applyMargins(function() {
    if (node.stack) {
      self.processVerticalContainer(node.stack);
    } else if (node.columns) {
      self.processColumns(node);
    } else if (node.ul) {
      self.processList(false, node.ul, node._gapSize);
    } else if (node.ol) {
      self.processList(true, node.ol, node._gapSize);
    } else if (node.table) {
      self.processTable(node);
    } else if (node.text !== undefined) {
      self.processLeaf(node);
    } else if (node.image) {
      self.processImage(node);
    } else if (node.canvas) {
      self.processCanvas(node);
    } else if (!node._span) {
		throw 'Unrecognized document structure: ' + JSON.stringify(node, fontStringify);
		}
	});

	function applyMargins(callback) {
		var margin = node._margin;

    if (node.pageBreak === 'before') {
        self.writer.moveToNextPage();
    }

		if (margin) {
			self.writer.context().moveDown(margin[1]);
			self.writer.context().addMargin(margin[0], margin[2]);
		}

		callback();

		if(margin) {
			self.writer.context().addMargin(-margin[0], -margin[2]);
			self.writer.context().moveDown(margin[3]);
		}

    if (node.pageBreak === 'after') {
        self.writer.moveToNextPage();
    }
	}
};

// vertical container
LayoutBuilder.prototype.processVerticalContainer = function(items) {
	var self = this;
	items.forEach(function(item) {
		self.processNode(item);

		//TODO: paragraph gap
	});
};

// columns
LayoutBuilder.prototype.processColumns = function(columnNode) {
	var columns = columnNode.columns;
	var availableWidth = this.writer.context().availableWidth;
	var gaps = gapArray(columnNode._gap);

	if (gaps) availableWidth -= (gaps.length - 1) * columnNode._gap;

	ColumnCalculator.buildColumnWidths(columns, availableWidth);
	this.processRow(columns, columns, gaps);


	function gapArray(gap) {
		if (!gap) return null;

		var gaps = [];
		gaps.push(0);

		for(var i = columns.length - 1; i > 0; i--) {
			gaps.push(gap);
		}

		return gaps;
	}
};

LayoutBuilder.prototype.processRow = function(columns, widths, gaps, tableBody, tableRow) {
  var self = this;
  var pageBreaks = [];

  this.tracker.auto('pageChanged', storePageBreakData, function() {
    widths = widths || columns;

    self.writer.context().beginColumnGroup();

    for(var i = 0, l = columns.length; i < l; i++) {
      var column = columns[i];
      var width = widths[i]._calcWidth;
      var leftOffset = colLeftOffset(i);

      if (column.colSpan && column.colSpan > 1) {
          for(var j = 1; j < column.colSpan; j++) {
              width += widths[++i]._calcWidth + gaps[i];
          }
      }

      self.writer.context().beginColumn(width, leftOffset, getEndingCell(column, i));
      if (!column._span) {
        self.processNode(column);
      } else if (column._columnEndingContext) {
        // row-span ending
        self.writer.context().markEnding(column);
      }
    }

    self.writer.context().completeColumnGroup();
  });

  return pageBreaks;

  function storePageBreakData(data) {
    var pageDesc;

    for(var i = 0, l = pageBreaks.length; i < l; i++) {
      var desc = pageBreaks[i];
      if (desc.prevPage === data.prevPage) {
        pageDesc = desc;
        break;
      }
    }

    if (!pageDesc) {
      pageDesc = data;
      pageBreaks.push(pageDesc);
    }
    pageDesc.prevY = Math.max(pageDesc.prevY, data.prevY);
    pageDesc.y = Math.min(pageDesc.y, data.y);
  }

	function colLeftOffset(i) {
		if (gaps && gaps.length > i) return gaps[i];
		return 0;
	}

  function getEndingCell(column, columnIndex) {
    if (column.rowSpan && column.rowSpan > 1) {
      var endingRow = tableRow + column.rowSpan - 1;
      if (endingRow >= tableBody.length) throw 'Row span for column ' + columnIndex + ' (with indexes starting from 0) exceeded row count';
      return tableBody[endingRow][columnIndex];
    }

    return null;
  }
};

// lists
LayoutBuilder.prototype.processList = function(orderedList, items, gapSize) {
	var self = this;

	this.writer.context().addMargin(gapSize.width);

	var nextMarker;
	this.tracker.auto('lineAdded', addMarkerToFirstLeaf, function() {
		items.forEach(function(item) {
			nextMarker = item.listMarker;
			self.processNode(item);
		});
	});

	this.writer.context().addMargin(-gapSize.width);

	function addMarkerToFirstLeaf(line) {
		// I'm not very happy with the way list processing is implemented
		// (both code and algorithm should be rethinked)
		if (nextMarker) {
			var marker = nextMarker;
			nextMarker = null;

			if (marker.canvas) {
				var vector = marker.canvas[0];

				offsetVector(vector, -marker._minWidth, 0);
				self.writer.addVector(vector);
			} else {
				var markerLine = new Line(self.pageSize.width);
				markerLine.addInline(marker._inlines[0]);
				markerLine.x = -marker._minWidth;
				markerLine.y = line.getAscenderHeight() - markerLine.getAscenderHeight();
				self.writer.addLine(markerLine, true);
			}
		}
	}
};

// tables
LayoutBuilder.prototype.processTable = function(tableNode) {
  var processor = new TableProcessor(tableNode);

  processor.beginTable(this.writer);

  for(var i = 0, l = tableNode.table.body.length; i < l; i++) {
    processor.beginRow(i, this.writer);

    var pageBreaks = this.processRow(tableNode.table.body[i], tableNode.table.widths, tableNode._offsets.offsets, tableNode.table.body, i);

    processor.endRow(i, this.writer, pageBreaks);
  }

  processor.endTable(this.writer);
};

// leafs (texts)
LayoutBuilder.prototype.processLeaf = function(node) {
	var line = this.buildNextLine(node);

	while (line) {
		this.writer.addLine(line);
		line = this.buildNextLine(node);
	}
};

LayoutBuilder.prototype.buildNextLine = function(textNode) {
	if (!textNode._inlines || textNode._inlines.length === 0) return null;

	var line = new Line(this.writer.context().availableWidth);

	while(textNode._inlines && textNode._inlines.length > 0 && line.hasEnoughSpaceForInline(textNode._inlines[0])) {
		line.addInline(textNode._inlines.shift());
	}

	line.lastLineInParagraph = textNode._inlines.length === 0;
	return line;
};

// images
LayoutBuilder.prototype.processImage = function(node) {
    this.writer.addImage(node);
};

LayoutBuilder.prototype.processCanvas = function(node) {
	var height = node._minHeight;

	if (this.writer.context().availableHeight < height) {
		// TODO: support for canvas larger than a page
		// TODO: support for other overflow methods

		this.writer.moveToNextPage();
	}

	node.canvas.forEach(function(vector) {
		this.writer.addVector(vector);
	}, this);

	this.writer.context().moveDown(height);
};


module.exports = LayoutBuilder;

},{"./columnCalculator":59,"./docMeasure":60,"./documentContext":61,"./helpers":63,"./line":66,"./pageElementWriter":67,"./tableProcessor":71,"./traversalTracker":73}],66:[function(_dereq_,module,exports){
/* jslint node: true */
'use strict';

/**
* Creates an instance of Line
*
* @constructor
* @this {Line}
* @param {Number} Maximum width this line can have
*/
function Line(maxWidth) {
	this.maxWidth = maxWidth;
	this.leadingCut = 0;
	this.trailingCut = 0;
	this.inlineWidths = 0;
	this.inlines = [];
}

Line.prototype.getAscenderHeight = function() {
	var y = 0;

	this.inlines.forEach(function(inline) {
		y = Math.max(y, inline.font.ascender / 1000 * inline.fontSize);
	});
	return y;
};

Line.prototype.hasEnoughSpaceForInline = function(inline) {
	if (this.inlines.length === 0) return true;
	if (this.newLineForced) return false;

	return this.inlineWidths + inline.width - this.leadingCut - (inline.trailingCut || 0) <= this.maxWidth;
};

Line.prototype.addInline = function(inline) {
	if (this.inlines.length === 0) {
		this.leadingCut = inline.leadingCut || 0;
	}
	this.trailingCut = inline.trailingCut || 0;

	inline.x = this.inlineWidths - this.leadingCut;

	this.inlines.push(inline);
	this.inlineWidths += inline.width;

	if (inline.lineEnd) {
		this.newLineForced = true;
	}
};

Line.prototype.getWidth = function() {
	return this.inlineWidths - this.leadingCut - this.trailingCut;
};

/**
* Returns line height
* @return {Number}
*/
Line.prototype.getHeight = function() {
	var max = 0;

	this.inlines.forEach(function(item) {
		max = Math.max(max, item.height || 0);
	});

	return max;
};

module.exports = Line;

},{}],67:[function(_dereq_,module,exports){
/* jslint node: true */
'use strict';

var ElementWriter = _dereq_('./elementWriter');

/**
* Creates an instance of PageElementWriter - an extended ElementWriter
* which can handle:
* - page-breaks (it adds new pages when there's not enough space left),
* - repeatable fragments (like table-headers, which are repeated everytime
*                         a page-break occurs)
* - transactions (used for unbreakable-blocks when we want to make sure
*                 whole block will be rendered on the same page)
*/
function PageElementWriter(context, tracker) {
	this.transactionLevel = 0;
	this.repeatables = [];

	this.writer = new ElementWriter(context, tracker);
}

PageElementWriter.prototype.addLine = function(line, dontUpdateContextPosition) {
	if (!this.writer.addLine(line, dontUpdateContextPosition)) {
		this.moveToNextPage();
		this.writer.addLine(line, dontUpdateContextPosition);
	}
};

PageElementWriter.prototype.addImage = function(image) {
	if(!this.writer.addImage(image)) {
		this.moveToNextPage();
		this.writer.addImage(image);
	}
};

PageElementWriter.prototype.addVector = function(vector, ignoreContextX, ignoreContextY) {
	this.writer.addVector(vector, ignoreContextX, ignoreContextY);
};

PageElementWriter.prototype.addFragment = function(fragment) {
	if (!this.writer.addFragment(fragment)) {
		this.moveToNextPage();
		this.writer.addFragment(fragment);
	}
};

PageElementWriter.prototype.moveToNextPage = function() {
	var nextPageIndex = this.writer.context.page + 1;

	var prevPage = this.writer.context.page;
	var prevY = this.writer.context.y;

	if (nextPageIndex >= this.writer.context.pages.length) {
		// create new Page
		var page = { lines: [], vectors: [], images:[] };
		this.writer.context.pages.push(page);
		this.writer.context.page = nextPageIndex;
		this.writer.context.moveToPageTop();

		// add repeatable fragments
		this.repeatables.forEach(function(rep) {
			this.writer.addFragment(rep, true);
		}, this);
	} else {
		this.writer.context.page = nextPageIndex;
		this.writer.context.moveToPageTop();

		this.repeatables.forEach(function(rep) {
			this.writer.context.moveDown(rep.height);
		}, this);
	}

	this.writer.tracker.emit('pageChanged', {
		prevPage: prevPage,
		prevY: prevY,
		y: this.writer.context.y
	});
};

PageElementWriter.prototype.beginUnbreakableBlock = function(width, height) {
	if (this.transactionLevel++ === 0) {
		this.originalX = this.writer.context.x;
		this.writer.pushContext(width, height);
	}
};

PageElementWriter.prototype.commitUnbreakableBlock = function(forcedX, forcedY) {
	if (--this.transactionLevel === 0) {
		var unbreakableContext = this.writer.context;
		this.writer.popContext();

		if(unbreakableContext.pages.length > 0) {
			// no support for multi-page unbreakableBlocks
			var fragment = unbreakableContext.pages[0];
			fragment.xOffset = forcedX;
			fragment.yOffset = forcedY;

			//TODO: vectors can influence height in some situations
			fragment.height = unbreakableContext.y;

			if (forcedX !== undefined || forcedY !== undefined) {
				this.writer.addFragment(fragment, true, true, true);
			} else {
				this.addFragment(fragment);
			}
		}
	}
};

PageElementWriter.prototype.currentBlockToRepeatable = function() {
	var unbreakableContext = this.writer.context;
	var rep = { lines: [], vectors: [], images: [] };

	unbreakableContext.pages[0].lines.forEach(function(line) {
		rep.lines.push(line);
	});

	unbreakableContext.pages[0].vectors.forEach(function(vector) {
		rep.vectors.push(vector);
	});

	unbreakableContext.pages[0].images.forEach(function(img) {
		rep.images.push(img);
	});

	rep.xOffset = this.originalX;

	//TODO: vectors can influence height in some situations
	rep.height = unbreakableContext.y;

	return rep;
};

PageElementWriter.prototype.pushToRepeatables = function(rep) {
	this.repeatables.push(rep);
};

PageElementWriter.prototype.popFromRepeatables = function() {
	this.repeatables.pop();
};

PageElementWriter.prototype.context = function() {
	return this.writer.context;
};

module.exports = PageElementWriter;

},{"./elementWriter":62}],68:[function(_dereq_,module,exports){
/* jslint node: true */
/* global window */
'use strict';

var LayoutBuilder = _dereq_('./layoutBuilder');
var PdfKit = _dereq_('pdfmake-pdfkit');
var PDFReference = PdfKit.PDFReference;
var sizes = _dereq_('./standardPageSizes');
var ImageMeasure = _dereq_('./imageMeasure');


////////////////////////////////////////
// PdfPrinter

/**
 * @class Creates an instance of a PdfPrinter which turns document definition into a pdf
 *
 * @param {Object} fontDescriptors font definition dictionary
 *
 * @example
 * var fontDescriptors = {
 *	Roboto: {
 *		normal: 'fonts/Roboto-Regular.ttf',
 *		bold: 'fonts/Roboto-Medium.ttf',
 *		italics: 'fonts/Roboto-Italic.ttf',
 *		bolditalics: 'fonts/Roboto-Italic.ttf'
 *	}
 * };
 *
 * var printer = new PdfPrinter(fontDescriptors);
 */
function PdfPrinter(fontDescriptors) {
	this.fontDescriptors = fontDescriptors;
}

/**
 * Executes layout engine for the specified document and renders it into a pdfkit document
 * ready to be saved.
 *
 * @param {Object} docDefinition document definition
 * @param {Object} docDefinition.content an array describing the pdf structure (for more information take a look at the examples in the /examples folder)
 * @param {Object} [docDefinition.defaultStyle] default (implicit) style definition
 * @param {Object} [docDefinition.styles] dictionary defining all styles which can be used in the document
 * @param {Object} [docDefinition.pageSize] page size (pdfkit units, A4 dimensions by default)
 * @param {Number} docDefinition.pageSize.width width
 * @param {Number} docDefinition.pageSize.height height
 * @param {Object} [docDefinition.pageMargins] page margins (pdfkit units)
 *
 * @example
 *
 * var docDefinition = {
 *	content: [
 *		'First paragraph',
 *		'Second paragraph, this time a little bit longer',
 *		{ text: 'Third paragraph, slightly bigger font size', fontSize: 20 },
 *		{ text: 'Another paragraph using a named style', style: 'header' },
 *		{ text: ['playing with ', 'inlines' ] },
 *		{ text: ['and ', { text: 'restyling ', bold: true }, 'them'] },
 *	],
 *	styles: {
 *		header: { fontSize: 30, bold: true }
 *	}
 * }
 *
 * var pdfDoc = printer.createPdfKitDocument(docDefinition);
 *
 * pdfDoc.pipe(fs.createWriteStream('sample.pdf'));
 * pdfDoc.end();
 *
 * @return {Object} a pdfKit document object which can be saved or encode to data-url
 */
PdfPrinter.prototype.createPdfKitDocument = function(docDefinition, options) {
	options = options || {};

	var pageSize = pageSize2widthAndHeight(docDefinition.pageSize || 'a4');

  if(docDefinition.pageOrientation === 'landscape') {
    pageSize = { width: pageSize.height, height: pageSize.width };
  }

	this.pdfKitDoc = new PdfKit({ size: [ pageSize.width, pageSize.height ]});
	this.pdfKitDoc.info.Producer = 'pdfmake';
	this.pdfKitDoc.info.Creator = 'pdfmake';
	this.fontProvider = new FontProvider(this.fontDescriptors, this.pdfKitDoc);

  docDefinition.images = docDefinition.images || {};

	var builder = new LayoutBuilder(
		pageSize,
		fixPageMargins(docDefinition.pageMargins || 40),
        new ImageMeasure(this.pdfKitDoc, docDefinition.images));

  registerDefaultTableLayouts(builder);
  if (options.tableLayouts) {
    builder.registerTableLayouts(options.tableLayouts);
  }

	var pages = builder.layoutDocument(docDefinition.content, this.fontProvider, docDefinition.styles || {}, docDefinition.defaultStyle || { fontSize: 12, font: 'Roboto' }, docDefinition.header, docDefinition.footer, docDefinition.images);

	renderPages(pages, this.fontProvider, this.pdfKitDoc);

	if(options.autoPrint){
        var jsRef = this.pdfKitDoc.ref({
			S: 'JavaScript',
			JS: new StringObject('this.print\\(true\\);')
		});
		var namesRef = this.pdfKitDoc.ref({
			Names: [new StringObject('EmbeddedJS'), new PdfKit.PDFReference(this.pdfKitDoc, jsRef.id)],
		});

		jsRef.end();
		namesRef.end();

		this.pdfKitDoc._root.data.Names = {
			JavaScript: new PdfKit.PDFReference(this.pdfKitDoc, namesRef.id)
		};
	}
	return this.pdfKitDoc;
};

function fixPageMargins(margin) {
    if (!margin) return null;

    if (typeof margin === 'number' || margin instanceof Number) {
        margin = { left: margin, right: margin, top: margin, bottom: margin };
    } else if (margin instanceof Array) {
        if (margin.length === 2) {
            margin = { left: margin[0], top: margin[1], right: margin[0], bottom: margin[1] };
        } else if (margin.length === 4) {
            margin = { left: margin[0], top: margin[1], right: margin[2], bottom: margin[3] };
        } else throw 'Invalid pageMargins definition';
    }

    return margin;
}

function registerDefaultTableLayouts(layoutBuilder) {
  layoutBuilder.registerTableLayouts({
    noBorders: {
      hLineWidth: function(i) { return 0; },
      vLineWidth: function(i) { return 0; },
      paddingLeft: function(i) { return i && 4 || 0; },
      paddingRight: function(i, node) { return (i < node.table.widths.length - 1) ? 4 : 0; },
    },
    headerLineOnly: {
      hLineWidth: function(i, node) {
        if (i === 0 || i === node.table.body.length) return 0;
        return (i === node.table.headerRows) ? 2 : 0;
      },
      vLineWidth: function(i) { return 0; },
      paddingLeft: function(i) {
        return i === 0 ? 0 : 8;
      },
      paddingRight: function(i, node) {
        return (i === node.table.widths.length - 1) ? 0 : 8;
      }
    },
    lightHorizontalLines: {
      hLineWidth: function(i, node) {
        if (i === 0 || i === node.table.body.length) return 0;
        return (i === node.table.headerRows) ? 2 : 1;
      },
      vLineWidth: function(i) { return 0; },
      hLineColor: function(i) { return i === 1 ? 'black' : '#aaa'; },
      paddingLeft: function(i) {
        return i === 0 ? 0 : 8;
      },
      paddingRight: function(i, node) {
        return (i === node.table.widths.length - 1) ? 0 : 8;
      }
    }
  });
}

var defaultLayout = {
  hLineWidth: function(i, node) { return 1; }, //return node.table.headerRows && i === node.table.headerRows && 3 || 0; },
  vLineWidth: function(i, node) { return 1; },
  hLineColor: function(i, node) { return 'black'; },
  vLineColor: function(i, node) { return 'black'; },
  paddingLeft: function(i, node) { return 4; }, //i && 4 || 0; },
  paddingRight: function(i, node) { return 4; }, //(i < node.table.widths.length - 1) ? 4 : 0; },
  paddingTop: function(i, node) { return 2; },
  paddingBottom: function(i, node) { return 2; }
};

function pageSize2widthAndHeight(pageSize) {
    if (typeof pageSize == 'string' || pageSize instanceof String) {
        var size = sizes[pageSize.toUpperCase()];
        if (!size) throw ('Page size ' + pageSize + ' not recognized');
        return { width: size[0], height: size[1] };
    }

    return pageSize;
}

function StringObject(str){
	this.isString = true;
	this.toString = function(){
		return str;
	};
}

function renderPages(pages, fontProvider, pdfKitDoc) {
	for(var i = 0, l = pages.length; i < l; i++) {
		if (i > 0) {
			pdfKitDoc.addPage();
		}

		setFontRefs(fontProvider, pdfKitDoc);

		var page = pages[i];
		for(var vi = 0, vl = page.vectors.length; vi < vl; vi++) {
			var vector = page.vectors[vi];
			renderVector(vector, pdfKitDoc);
		}
		for(var li = 0, ll = page.lines.length; li < ll; li++) {
			var line = page.lines[li];
			renderLine(line, line.x, line.y, pdfKitDoc);
		}
        for(var ii = 0, il = page.images.length; ii < il; ii++) {
            var image = page.images[ii];
            renderImage(image, image.x, image.y, pdfKitDoc);
        }
	}
}

function setFontRefs(fontProvider, pdfKitDoc) {
	for(var fontName in fontProvider.cache) {
		var desc = fontProvider.cache[fontName];

		for (var fontType in desc) {
			var font = desc[fontType];
			var _ref, _base, _name;

			if (!(_ref = (_base = pdfKitDoc.page.fonts)[_name = font.id])) {
				_base[_name] = font.ref;
			}
		}
	}
}

function renderLine(line, x, y, pdfKitDoc) {
	x = x || 0;
	y = y || 0;

	var ascenderHeight = line.getAscenderHeight();
	var lineHeight = line.getHeight();

	//TODO: line.optimizeInlines();
	for(var i = 0, l = line.inlines.length; i < l; i++) {
		var inline = line.inlines[i];

		pdfKitDoc.fill(inline.color || 'black');

		pdfKitDoc.save();
		pdfKitDoc.transform(1, 0, 0, -1, 0, pdfKitDoc.page.height);

		pdfKitDoc.addContent('BT');
		var a = (inline.font.ascender / 1000 * inline.fontSize);

		pdfKitDoc.addContent('' + (x + inline.x) + ' ' + (pdfKitDoc.page.height - y - ascenderHeight) + ' Td');
		pdfKitDoc.addContent('/' + inline.font.id + ' ' + inline.fontSize + ' Tf');

		pdfKitDoc.addContent('<' + encode(inline.font, inline.text) + '> Tj');

		pdfKitDoc.addContent('ET');
		pdfKitDoc.restore();
	}
}

function encode(font, text) {
	font.use(text);

	text = font.encode(text);
	text = ((function() {
		var _results = [];

		for (var i = 0, _ref2 = text.length; 0 <= _ref2 ? i < _ref2 : i > _ref2; 0 <= _ref2 ? i++ : i--) {
			_results.push(text.charCodeAt(i).toString(16));
		}
		return _results;
	})()).join('');

	return text;
}

function renderVector(vector, pdfDoc) {
	//TODO: pdf optimization (there's no need to write all properties everytime)
	pdfDoc.lineWidth(vector.lineWidth || 1);
	if (vector.dash) {
		pdfDoc.dash(vector.dash.length, { space: vector.dash.space || vector.dash.length });
	} else {
		pdfDoc.undash();
	}
	pdfDoc.fillOpacity(vector.fillOpacity || 1);
	pdfDoc.strokeOpacity(vector.strokeOpacity || 1);
	pdfDoc.lineJoin(vector.lineJoin || 'miter');

	//TODO: clipping

	switch(vector.type) {
		case 'ellipse':
			pdfDoc.ellipse(vector.x, vector.y, vector.r1, vector.r2);
			break;
		case 'rect':
			if (vector.r) {
				pdfDoc.roundedRect(vector.x, vector.y, vector.w, vector.h, vector.r);
			} else {
				pdfDoc.rect(vector.x, vector.y, vector.w, vector.h);
			}
			break;
		case 'line':
			pdfDoc.moveTo(vector.x1, vector.y1);
			pdfDoc.lineTo(vector.x2, vector.y2);
			break;
		case 'polyline':
			if (vector.points.length === 0) break;

			pdfDoc.moveTo(vector.points[0].x, vector.points[0].y);
			for(var i = 1, l = vector.points.length; i < l; i++) {
				pdfDoc.lineTo(vector.points[i].x, vector.points[i].y);
			}

			if (vector.points.length > 1) {
				var p1 = vector.points[0];
				var pn = vector.points[vector.points.length - 1];

				if (vector.closePath || p1.x === pn.x && p1.y === pn.y) {
					pdfDoc.closePath();
				}
			}
			break;
	}

	if (vector.color && vector.lineColor) {
		pdfDoc.fillAndStroke(vector.color, vector.lineColor);
	} else if (vector.color) {
		pdfDoc.fill(vector.color);
	} else {
		pdfDoc.stroke(vector.lineColor || 'black');
	}
}

function renderImage(image, x, y, pdfKitDoc) {
    pdfKitDoc.image(image.image, image.x, image.y, { width: image._width, height: image._height });
}

function FontProvider(fontDescriptors, pdfDoc) {
	this.fonts = {};
	this.pdfDoc = pdfDoc;
	this.cache = {};

	for(var font in fontDescriptors) {
		if (fontDescriptors.hasOwnProperty(font)) {
			var fontDef = fontDescriptors[font];

			this.fonts[font] = {
				normal: fontDef.normal,
				bold: fontDef.bold,
				italics: fontDef.italics,
				bolditalics: fontDef.bolditalics
			};
		}
	}
}

FontProvider.prototype.provideFont = function(familyName, bold, italics) {
	if (!this.fonts[familyName]) return this.pdfDoc._font;

	var type = 'normal';

	if (bold && italics) type = 'bolditalics';
	else if (bold) type = 'bold';
	else if (italics) type = 'italics';

	if (!this.cache[familyName]) this.cache[familyName] = {};

	var cached = this.cache[familyName] && this.cache[familyName][type];

	if (cached) return cached;

	var fontCache = (this.cache[familyName] = this.cache[familyName] || {});
	fontCache[type] = this.pdfDoc.font(this.fonts[familyName][type])._font;
	return fontCache[type];
};

module.exports = PdfPrinter;


/* temporary browser extension */
PdfPrinter.prototype.fs = _dereq_('fs');

},{"./imageMeasure":64,"./layoutBuilder":65,"./standardPageSizes":69,"fs":"x/K9gc","pdfmake-pdfkit":18}],69:[function(_dereq_,module,exports){
module.exports = {
	'4A0': [4767.87, 6740.79],
	'2A0': [3370.39, 4767.87],
	A0: [2383.94, 3370.39],
	A1: [1683.78, 2383.94],
	A2: [1190.55, 1683.78],
	A3: [841.89, 1190.55],
	A4: [595.28, 841.89],
	A5: [419.53, 595.28],
	A6: [297.64, 419.53],
	A7: [209.76, 297.64],
	A8: [147.40, 209.76],
	A9: [104.88, 147.40],
	A10: [73.70, 104.88],
	B0: [2834.65, 4008.19],
	B1: [2004.09, 2834.65],
	B2: [1417.32, 2004.09],
	B3: [1000.63, 1417.32],
	B4: [708.66, 1000.63],
	B5: [498.90, 708.66],
	B6: [354.33, 498.90],
	B7: [249.45, 354.33],
	B8: [175.75, 249.45],
	B9: [124.72, 175.75],
	B10: [87.87, 124.72],
	C0: [2599.37, 3676.54],
	C1: [1836.85, 2599.37],
	C2: [1298.27, 1836.85],
	C3: [918.43, 1298.27],
	C4: [649.13, 918.43],
	C5: [459.21, 649.13],
	C6: [323.15, 459.21],
	C7: [229.61, 323.15],
	C8: [161.57, 229.61],
	C9: [113.39, 161.57],
	C10: [79.37, 113.39],
	RA0: [2437.80, 3458.27],
	RA1: [1729.13, 2437.80],
	RA2: [1218.90, 1729.13],
	RA3: [864.57, 1218.90],
	RA4: [609.45, 864.57],
	SRA0: [2551.18, 3628.35],
	SRA1: [1814.17, 2551.18],
	SRA2: [1275.59, 1814.17],
	SRA3: [907.09, 1275.59],
	SRA4: [637.80, 907.09],
	EXECUTIVE: [521.86, 756.00],
	FOLIO: [612.00, 936.00],
	LEGAL: [612.00, 1008.00],
	LETTER: [612.00, 792.00],
	TABLOID: [792.00, 1224.00]
};

},{}],70:[function(_dereq_,module,exports){
/* jslint node: true */
'use strict';

/**
* Creates an instance of StyleContextStack used for style inheritance and style overrides
*
* @constructor
* @this {StyleContextStack}
* @param {Object} named styles dictionary
* @param {Object} optional default style definition
*/
function StyleContextStack (styleDictionary, defaultStyle) {
	this.defaultStyle = defaultStyle || {};
	this.styleDictionary = styleDictionary;
	this.styleOverrides = [];
}

/**
* Creates cloned version of current stack
* @return {StyleContextStack} current stack snapshot
*/
StyleContextStack.prototype.clone = function() {
	var stack = new StyleContextStack(this.styleDictionary, this.defaultStyle);

	this.styleOverrides.forEach(function(item) {
		stack.styleOverrides.push(item);
	});

	return stack;
};

/**
* Pushes style-name or style-overrides-object onto the stack for future evaluation
*
* @param {String|Object} styleNameOrOverride style-name (referring to styleDictionary) or
*                                            a new dictionary defining overriding properties
*/
StyleContextStack.prototype.push = function(styleNameOrOverride) {
	this.styleOverrides.push(styleNameOrOverride);
};

/**
* Removes last style-name or style-overrides-object from the stack
*
* @param {Number} howMany - optional number of elements to be popped (if not specified,
*                           one element will be removed from the stack)
*/
StyleContextStack.prototype.pop = function(howMany) {
	howMany = howMany || 1;

	while(howMany-- > 0) {
		this.styleOverrides.pop();
	}
};

/**
* Creates a set of named styles or/and a style-overrides-object based on the item,
* pushes those elements onto the stack for future evaluation and returns the number
* of elements pushed, so they can be easily poped then.
*
* @param {Object} item - an object with optional style property and/or style overrides
* @return the number of items pushed onto the stack
*/
StyleContextStack.prototype.autopush = function(item) {
	if (typeof item === 'string' || item instanceof String) return 0;

	var styleNames = [];

	if (item.style) {
		if (item.style instanceof Array) {
			styleNames = item.style;
		} else {
			styleNames = [ item.style ];
		}
	}

	for(var i = 0, l = styleNames.length; i < l; i++) {
		this.push(styleNames[i]);
	}

	var styleOverrideObject = {};
	var pushSOO = false;

	[
		'font',
		'fontSize',
		'bold',
		'italics',
		'alignment',
		'color',
		'columnGap'
		//'tableCellPadding'
		// 'cellBorder',
		// 'headerCellBorder',
		// 'oddRowCellBorder',
		// 'evenRowCellBorder',
		// 'tableBorder'
	].forEach(function(key) {
		if (item[key] !== undefined && item[key] !== null) {
			styleOverrideObject[key] = item[key];
			pushSOO = true;
		}
	});

	if (pushSOO) {
		this.push(styleOverrideObject);
	}

	return styleNames.length + (pushSOO ? 1 : 0);
};

/**
* Automatically pushes elements onto the stack, using autopush based on item,
* executes callback and then pops elements back. Returns value returned by callback
*
* @param  {Object}   item - an object with optional style property and/or style overrides
* @param  {Function} function to be called between autopush and pop
* @return {Object} value returned by callback
*/
StyleContextStack.prototype.auto = function(item, callback) {
	var pushedItems = this.autopush(item);
	var result = callback();

	if (pushedItems > 0) {
		this.pop(pushedItems);
	}

	return result;
};

/**
* Evaluates stack and returns value of a named property
*
* @param {String} property - property name
* @return property value or null if not found
*/
StyleContextStack.prototype.getProperty = function(property) {
	if (this.styleOverrides) {
		for(var i = this.styleOverrides.length - 1; i >= 0; i--) {
			var item = this.styleOverrides[i];

			if (typeof item == 'string' || item instanceof String) {
				// named-style-override

				var style = this.styleDictionary[item];
				if (style && style[property] !== null && style[property] !== undefined) {
					return style[property];
				}
			} else {
				// style-overrides-object
				if (item[property] !== undefined && item[property] !== null) {
					return item[property];
				}
			}
		}
	}

	return this.defaultStyle && this.defaultStyle[property];
};

module.exports = StyleContextStack;

},{}],71:[function(_dereq_,module,exports){
var ColumnCalculator = _dereq_('./columnCalculator');

function TableProcessor(tableNode) {
  this.tableNode = tableNode;
}

TableProcessor.prototype.beginTable = function(writer) {
  var tableNode;
  var availableWidth;
  var self = this;

  tableNode = this.tableNode;
  this.offsets = tableNode._offsets;
  this.layout = tableNode._layout;

  availableWidth = writer.context().availableWidth - this.offsets.total;
  ColumnCalculator.buildColumnWidths(tableNode.table.widths, availableWidth);

  this.tableWidth = tableNode._offsets.total + getTableInnerContentWidth();
  this.rowSpanData = prepareRowSpanData();

  this.headerRows = tableNode.table.headerRows || 0;
  this.rowsWithoutPageBreak = this.headerRows + (tableNode.table.keepWithHeaderRows || 0);
  this.dontBreakRows = tableNode.table.dontBreakRows || false;

  if (this.rowsWithoutPageBreak) {
    writer.beginUnbreakableBlock();
  }

  this.drawHorizontalLine(0, writer);

  function getTableInnerContentWidth() {
    var width = 0;

    tableNode.table.widths.forEach(function(w) {
      width += w._calcWidth;
    });

    return width;
  }

  function prepareRowSpanData() {
    var rsd = [];
    var x = 0;
    var lastWidth = 0;

    rsd.push({ left: 0, rowSpan: 0 });

    for(var i = 0, l = self.tableNode.table.body[0].length; i < l; i++) {
      var paddings = self.layout.paddingLeft(i, self.tableNode) + self.layout.paddingRight(i, self.tableNode);
      var lBorder = self.layout.vLineWidth(i, self.tableNode);
      lastWidth = paddings + lBorder + self.tableNode.table.widths[i]._calcWidth;
      rsd[rsd.length - 1].width = lastWidth;
      x += lastWidth;
      rsd.push({ left: x, rowSpan: 0, width: 0 });
    }

    return rsd;
  }
};

TableProcessor.prototype.beginRow = function(rowIndex, writer) {
    if(this.dontBreakRows) {
        writer.beginUnbreakableBlock();
    }
  this.rowTopY = writer.context().y;
  this.reservedAtBottom = this.layout.hLineWidth(rowIndex + 1, this.tableNode) + this.layout.paddingBottom(rowIndex, this.tableNode);

  writer.context().availableHeight -= this.reservedAtBottom;

  writer.context().moveDown(this.layout.paddingTop(rowIndex, this.tableNode));
};

TableProcessor.prototype.drawHorizontalLine = function(lineIndex, writer, overrideY) {
  var lineWidth = this.layout.hLineWidth(lineIndex, this.tableNode);
  if (lineWidth) {
    var offset = lineWidth / 2;
    var currentLine = null;

    for(var i = 0, l = this.rowSpanData.length; i < l; i++) {
      var data = this.rowSpanData[i];
      var shouldDrawLine = !data.rowSpan;

      if (!currentLine && shouldDrawLine) {
        currentLine = { left: data.left, width: 0 };
      }

      if (shouldDrawLine) {
        currentLine.width += (data.width || 0);
      }

      var y = (overrideY || 0) + offset;

      if (!shouldDrawLine || i === l - 1) {
        if (currentLine) {
          writer.addVector({
            type: 'line',
            x1: currentLine.left,
            x2: currentLine.left + currentLine.width,
            y1: y,
            y2: y,
            lineWidth: lineWidth,
            lineColor: this.layout.hLineColor(lineIndex, this.tableNode)
          }, false, overrideY);
          currentLine = null;
        }
      }
    }

    writer.context().moveDown(lineWidth);
  }
};

TableProcessor.prototype.drawVerticalLine = function(x, y0, y1, vLineIndex, writer) {
  var width = this.layout.vLineWidth(vLineIndex, this.tableNode);
  if (width === 0) return;

  writer.addVector({
    type: 'line',
    x1: x + width/2,
    x2: x + width/2,
    y1: y0,
    y2: y1,
    lineWidth: width,
    lineColor: this.layout.vLineColor(vLineIndex, this.tableNode)
  }, false, true);
};

TableProcessor.prototype.endTable = function(writer) {
  writer.popFromRepeatables();
};

TableProcessor.prototype.endRow = function(rowIndex, writer, pageBreaks) {
    var i;
    var self = this;

    writer.context().moveDown(this.layout.paddingBottom(rowIndex, this.tableNode));

    var endingPage = writer.context().page;
    var endingY = writer.context().y;

    var xs = getLineXs();

    var ys = [];

    var hasBreaks = pageBreaks && pageBreaks.length > 0;

    ys.push({
      y0: this.rowTopY,
      page: hasBreaks ? pageBreaks[0].prevPage : endingPage
    });

    if (hasBreaks) {
      for(i = 0, l = pageBreaks.length; i < l; i++) {
        var pageBreak = pageBreaks[i];
        ys[ys.length - 1].y1 = pageBreak.prevY;

        ys.push({y0: pageBreak.y, page: pageBreak.prevPage + 1});
      }
    }

    ys[ys.length - 1].y1 = endingY;

    for(var yi = 0, yl = ys.length; yi < yl; yi++) {
      var willBreak = yi < ys.length - 1;

      var y1 = ys[yi].y0;
      var y2 = ys[yi].y1;
      if (writer.context().page != ys[yi].page) {
        writer.context().page = ys[yi].page;

        //TODO: buggy, availableHeight should be updated on every pageChanged event
        // TableProcessor should be pageChanged listener, instead of processRow
        this.reservedAtBottom = 0;
      }

      for(i = 0, l = xs.length; i < l; i++) {
        var topOffset = this.layout.hLineWidth(rowIndex, this.tableNode);
        var bottomOffset = this.layout.hLineWidth(rowIndex + 1, this.tableNode);
        this.drawVerticalLine(xs[i].x, y1 - topOffset, y2 + bottomOffset, xs[i].index, writer);
      }

      if (willBreak) {
        this.drawHorizontalLine(rowIndex + 1, writer, y2);
      }
    }

    writer.context().page = endingPage;
    writer.context().y = endingY;

    var row = this.tableNode.table.body[rowIndex];
    for(i = 0, l = row.length; i < l; i++) {
      if (row[i].rowSpan) {
        this.rowSpanData[i].rowSpan = row[i].rowSpan;

        // fix colSpans
        if (row[i].colSpan && row[i].colSpan > 1) {
          for(var j = 1; j < row[i].colSpan; j++) {
            this.tableNode.table.body[rowIndex + j][i]._colSpan = row[i].colSpan;
          }
        }
      }

      if(this.rowSpanData[i].rowSpan > 0) {
        this.rowSpanData[i].rowSpan--;
      }
    }

    this.drawHorizontalLine(rowIndex + 1, writer);

    if(this.headerRows && rowIndex === this.headerRows - 1) {
      this.headerRepeatable = writer.currentBlockToRepeatable();
    }

    if(this.dontBreakRows) {
        writer.commitUnbreakableBlock();
    }

    if(this.headerRepeatable && (rowIndex === (this.rowsWithoutPageBreak - 1) || rowIndex === this.tableNode.table.body.length - 1)) {
      writer.commitUnbreakableBlock();
      writer.pushToRepeatables(this.headerRepeatable);
      this.headerRepeatable = null;
    }

    writer.context().availableHeight += this.reservedAtBottom;

    function getLineXs() {
      var result = [];
      var cols = 0;

      for(var i = 0, l = self.tableNode.table.body[rowIndex].length; i < l; i++) {
        if (!cols) {
          result.push({ x: self.rowSpanData[i].left, index: i});

          var item = self.tableNode.table.body[rowIndex][i];
          cols = (item._colSpan || item.colSpan || 0);
        }
        if (cols > 0) {
          cols--;
        }
      }

      result.push({ x: self.rowSpanData[self.rowSpanData.length - 1].left, index: self.rowSpanData.length - 1});

      return result;
    }
};

module.exports = TableProcessor;

},{"./columnCalculator":59}],72:[function(_dereq_,module,exports){
/* jslint node: true */
'use strict';

var WORD_RE = /([^ ,\/!.?:;\-\n]*[ ,\/!.?:;\-]*)|\n/g;
// /\S*\s*/g to be considered (I'm not sure however - we shouldn't split 'aaa !!!!')

var LEADING = /^(\s)+/g;
var TRAILING = /(\s)+$/g;

/**
* Creates an instance of TextTools - text measurement utility
*
* @constructor
* @param {FontProvider} fontProvider
*/
function TextTools(fontProvider) {
	this.fontProvider = fontProvider;
}

/**
* Converts an array of strings (or inline-definition-objects) into a set of inlines
* and their min/max widths
* @param  {Object} textArray - an array of inline-definition-objects (or strings)
* @param  {Number} maxWidth - max width a single Line should have
* @return {Array} an array of Lines
*/
TextTools.prototype.buildInlines = function(textArray, styleContextStack) {
	var measured = measure(this.fontProvider, textArray, styleContextStack);

	var minWidth = 0,
		maxWidth = 0,
		currentLineWidth;

	measured.forEach(function (inline) {
		minWidth = Math.max(minWidth, inline.width - inline.leadingCut - inline.trailingCut);

		if (!currentLineWidth) {
			currentLineWidth = { width: 0, leadingCut: inline.leadingCut, trailingCut: 0 };
		}

		currentLineWidth.width += inline.width;
		currentLineWidth.trailingCut = inline.trailingCut;

		maxWidth = Math.max(maxWidth, getTrimmedWidth(currentLineWidth));

		if (inline.lineEnd) {
			currentLineWidth = null;
		}
	});

	return {
		items: measured,
		minWidth: minWidth,
		maxWidth: maxWidth
	};

	function getTrimmedWidth(item) {
		return Math.max(0, item.width - item.leadingCut - item.trailingCut);
	}
};

/**
* Returns size of the specified string (without breaking it) using the current style
* @param  {String} text              text to be measured
* @param  {Object} styleContextStack current style stack
* @return {Object}                   size of the specified string
*/
TextTools.prototype.sizeOfString = function(text, styleContextStack) {
	text = text.replace('\t', '    ');

	//TODO: refactor - extract from measure
	var fontName = getStyleProperty({}, styleContextStack, 'font', 'Roboto');
	var fontSize = getStyleProperty({}, styleContextStack, 'fontSize', 12);
	var bold = getStyleProperty({}, styleContextStack, 'bold', false);
	var italics = getStyleProperty({}, styleContextStack, 'italics', false);

	var font = this.fontProvider.provideFont(fontName, bold, italics);

	return {
		width: font.widthOfString(removeDiacritics(text), fontSize),
		height: font.lineHeight(fontSize),
		fontSize: fontSize,
		ascender: font.ascender / 1000 * fontSize,
		decender: font.decender / 1000 * fontSize
	};
};

function splitWords(text) {
	var results = [];
	text = text.replace('\t', '    ');

	var array = text.match(WORD_RE);

	// i < l - 1, because the last match is always an empty string
	// other empty strings however are treated as new-lines
	for(var i = 0, l = array.length; i < l - 1; i++) {
		var item = array[i];

		var isNewLine = item.length === 0;

		if (!isNewLine) {
			results.push({text: item});
		}
		else {
			var shouldAddLine = (results.length === 0 || results[results.length - 1].lineEnd);

			if (shouldAddLine) {
				results.push({ text: '', lineEnd: true });
			}
			else {
				results[results.length - 1].lineEnd = true;
			}
		}
	}

	return results;
}

function copyStyle(source, destination) {
	destination = destination || {};
	source = source || {}; //TODO: default style

	for(var key in source) {
		if (key != 'text' && source.hasOwnProperty(key)) {
			destination[key] = source[key];
		}
	}

	return destination;
}

function normalizeTextArray(array) {
	var results = [];

	if (typeof array == 'string' || array instanceof String) {
		array = [ array ];
	}

	for(var i = 0, l = array.length; i < l; i++) {
		var item = array[i];
		var style = null;
		var words;

		if (typeof item == 'string' || item instanceof String) {
			words = splitWords(item);
		} else {
			words = splitWords(item.text);
			style = copyStyle(item);
		}

		for(var i2 = 0, l2 = words.length; i2 < l2; i2++) {
			var result = {
				text: words[i2].text
			};

			if (words[i2].lineEnd) {
				result.lineEnd = true;
			}

			copyStyle(style, result);

			results.push(result);
		}
	}

	return results;
}

//TODO: support for other languages (currently only polish is supported)
var diacriticsMap = { 'Ą': 'A', 'Ć': 'C', 'Ę': 'E', 'Ł': 'L', 'Ń': 'N', 'Ó': 'O', 'Ś': 'S', 'Ź': 'Z', 'Ż': 'Z', 'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n', 'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z' };
// '  << atom.io workaround

function removeDiacritics(text) {
	return text.replace(/[^A-Za-z0-9\[\] ]/g, function(a) {
		return diacriticsMap[a] || a;
	});
}

function getStyleProperty(item, styleContextStack, property, defaultValue) {
	var value;

	if (item[property] !== undefined && item[property] !== null) {
		// item defines this property
		return item[property];
	}

	if (!styleContextStack) return defaultValue;

	styleContextStack.auto(item, function() {
		value = styleContextStack.getProperty(property);
	});

	if (value !== null && value !== undefined) {
		return value;
	} else {
		return defaultValue;
	}
}

function measure(fontProvider, textArray, styleContextStack) {
	var normalized = normalizeTextArray(textArray);

	normalized.forEach(function(item) {
		var fontName = getStyleProperty(item, styleContextStack, 'font', 'Roboto');
		var fontSize = getStyleProperty(item, styleContextStack, 'fontSize', 12);
		var bold = getStyleProperty(item, styleContextStack, 'bold', false);
		var italics = getStyleProperty(item, styleContextStack, 'italics', false);
		var color = getStyleProperty(item, styleContextStack, 'color', 'black');

		var font = fontProvider.provideFont(fontName, bold, italics);

		// TODO: character spacing
		item.width = font.widthOfString(removeDiacritics(item.text), fontSize);
		item.height = font.lineHeight(fontSize);

		var leadingSpaces = item.text.match(LEADING);
		var trailingSpaces = item.text.match(TRAILING);
		if (leadingSpaces) {
			item.leadingCut = font.widthOfString(leadingSpaces[0], fontSize);
		}
		else {
			item.leadingCut = 0;
		}

		if (trailingSpaces) {
			item.trailingCut = font.widthOfString(trailingSpaces[0], fontSize);
		}
		else {
			item.trailingCut = 0;
		}

		item.alignment = getStyleProperty(item, styleContextStack, 'alignment', 'left');
		item.font = font;
		item.fontSize = fontSize;
		item.color = color;
	});

	return normalized;
}

/****TESTS**** (add a leading '/' to uncomment)
TextTools.prototype.splitWords = splitWords;
TextTools.prototype.normalizeTextArray = normalizeTextArray;
TextTools.prototype.measure = measure;
// */


module.exports = TextTools;

},{}],73:[function(_dereq_,module,exports){
/* jslint node: true */
'use strict';

/**
* Creates an instance of TraversalTracker
*
* @constructor
*/
function TraversalTracker() {
	this.events = {};
}

TraversalTracker.prototype.startTracking = function(event, cb) {
	var callbacks = (this.events[event] || (this.events[event] = []));

	if (callbacks.indexOf(cb) < 0) {
		callbacks.push(cb);
	}
};

TraversalTracker.prototype.stopTracking = function(event, cb) {
	var callbacks = this.events[event];

	if (callbacks) {
		var index = callbacks.indexOf(cb);
		if (index >= 0) {
			callbacks.splice(index, 1);
		}
	}
};

TraversalTracker.prototype.emit = function(event) {
	var args = Array.prototype.slice.call(arguments, 1);

	var callbacks = this.events[event];

	if (callbacks) {
		callbacks.forEach(function(cb) {
			cb.apply(this, args);
		});
	}
};

TraversalTracker.prototype.auto = function(event, cb, innerBlock) {
	this.startTracking(event, cb);
	innerBlock();
	this.stopTracking(event, cb);
};

module.exports = TraversalTracker;

},{}]},{},[56])
(56)
});;/*! FileSaver.js
 *  A saveAs() FileSaver implementation.
 *  2014-01-24
 *
 *  By Eli Grey, http://eligrey.com
 *  License: X11/MIT
 *    See LICENSE.md
 */

/*global self */
/*jslint bitwise: true, indent: 4, laxbreak: true, laxcomma: true, smarttabs: true, plusplus: true */

/*! @source http://purl.eligrey.com/github/FileSaver.js/blob/master/FileSaver.js */

var saveAs = saveAs
  // IE 10+ (native saveAs)
  || (typeof navigator !== "undefined" &&
      navigator.msSaveOrOpenBlob && navigator.msSaveOrOpenBlob.bind(navigator))
  // Everyone else
  || (function(view) {
	"use strict";
	// IE <10 is explicitly unsupported
	if (typeof navigator !== "undefined" &&
	    /MSIE [1-9]\./.test(navigator.userAgent)) {
		return;
	}
	var
		  doc = view.document
		  // only get URL when necessary in case BlobBuilder.js hasn't overridden it yet
		, get_URL = function() {
			return view.URL || view.webkitURL || view;
		}
		, URL = view.URL || view.webkitURL || view
		, save_link = doc.createElementNS("http://www.w3.org/1999/xhtml", "a")
		, can_use_save_link = !view.externalHost && "download" in save_link
		, click = function(node) {
			var event = doc.createEvent("MouseEvents");
			event.initMouseEvent(
				"click", true, false, view, 0, 0, 0, 0, 0
				, false, false, false, false, 0, null
			);
			node.dispatchEvent(event);
		}
		, webkit_req_fs = view.webkitRequestFileSystem
		, req_fs = view.requestFileSystem || webkit_req_fs || view.mozRequestFileSystem
		, throw_outside = function(ex) {
			(view.setImmediate || view.setTimeout)(function() {
				throw ex;
			}, 0);
		}
		, force_saveable_type = "application/octet-stream"
		, fs_min_size = 0
		, deletion_queue = []
		, process_deletion_queue = function() {
			var i = deletion_queue.length;
			while (i--) {
				var file = deletion_queue[i];
				if (typeof file === "string") { // file is an object URL
					URL.revokeObjectURL(file);
				} else { // file is a File
					file.remove();
				}
			}
			deletion_queue.length = 0; // clear queue
		}
		, dispatch = function(filesaver, event_types, event) {
			event_types = [].concat(event_types);
			var i = event_types.length;
			while (i--) {
				var listener = filesaver["on" + event_types[i]];
				if (typeof listener === "function") {
					try {
						listener.call(filesaver, event || filesaver);
					} catch (ex) {
						throw_outside(ex);
					}
				}
			}
		}
		, FileSaver = function(blob, name) {
			// First try a.download, then web filesystem, then object URLs
			var
				  filesaver = this
				, type = blob.type
				, blob_changed = false
				, object_url
				, target_view
				, get_object_url = function() {
					var object_url = get_URL().createObjectURL(blob);
					deletion_queue.push(object_url);
					return object_url;
				}
				, dispatch_all = function() {
					dispatch(filesaver, "writestart progress write writeend".split(" "));
				}
				// on any filesys errors revert to saving with object URLs
				, fs_error = function() {
					// don't create more object URLs than needed
					if (blob_changed || !object_url) {
						object_url = get_object_url(blob);
					}
					if (target_view) {
						target_view.location.href = object_url;
					} else {
						window.open(object_url, "_blank");
					}
					filesaver.readyState = filesaver.DONE;
					dispatch_all();
				}
				, abortable = function(func) {
					return function() {
						if (filesaver.readyState !== filesaver.DONE) {
							return func.apply(this, arguments);
						}
					};
				}
				, create_if_not_found = {create: true, exclusive: false}
				, slice
			;
			filesaver.readyState = filesaver.INIT;
			if (!name) {
				name = "download";
			}
			if (can_use_save_link) {
				object_url = get_object_url(blob);
				// FF for Android has a nasty garbage collection mechanism
				// that turns all objects that are not pure javascript into 'deadObject'
				// this means `doc` and `save_link` are unusable and need to be recreated
				// `view` is usable though:
				doc = view.document;
				save_link = doc.createElementNS("http://www.w3.org/1999/xhtml", "a");
				save_link.href = object_url;
				save_link.download = name;
				var event = doc.createEvent("MouseEvents");
				event.initMouseEvent(
					"click", true, false, view, 0, 0, 0, 0, 0
					, false, false, false, false, 0, null
				);
				save_link.dispatchEvent(event);
				filesaver.readyState = filesaver.DONE;
				dispatch_all();
				return;
			}
			// Object and web filesystem URLs have a problem saving in Google Chrome when
			// viewed in a tab, so I force save with application/octet-stream
			// http://code.google.com/p/chromium/issues/detail?id=91158
			if (view.chrome && type && type !== force_saveable_type) {
				slice = blob.slice || blob.webkitSlice;
				blob = slice.call(blob, 0, blob.size, force_saveable_type);
				blob_changed = true;
			}
			// Since I can't be sure that the guessed media type will trigger a download
			// in WebKit, I append .download to the filename.
			// https://bugs.webkit.org/show_bug.cgi?id=65440
			if (webkit_req_fs && name !== "download") {
				name += ".download";
			}
			if (type === force_saveable_type || webkit_req_fs) {
				target_view = view;
			}
			if (!req_fs) {
				fs_error();
				return;
			}
			fs_min_size += blob.size;
			req_fs(view.TEMPORARY, fs_min_size, abortable(function(fs) {
				fs.root.getDirectory("saved", create_if_not_found, abortable(function(dir) {
					var save = function() {
						dir.getFile(name, create_if_not_found, abortable(function(file) {
							file.createWriter(abortable(function(writer) {
								writer.onwriteend = function(event) {
									target_view.location.href = file.toURL();
									deletion_queue.push(file);
									filesaver.readyState = filesaver.DONE;
									dispatch(filesaver, "writeend", event);
								};
								writer.onerror = function() {
									var error = writer.error;
									if (error.code !== error.ABORT_ERR) {
										fs_error();
									}
								};
								"writestart progress write abort".split(" ").forEach(function(event) {
									writer["on" + event] = filesaver["on" + event];
								});
								writer.write(blob);
								filesaver.abort = function() {
									writer.abort();
									filesaver.readyState = filesaver.DONE;
								};
								filesaver.readyState = filesaver.WRITING;
							}), fs_error);
						}), fs_error);
					};
					dir.getFile(name, {create: false}, abortable(function(file) {
						// delete file if it already exists
						file.remove();
						save();
					}), abortable(function(ex) {
						if (ex.code === ex.NOT_FOUND_ERR) {
							save();
						} else {
							fs_error();
						}
					}));
				}), fs_error);
			}), fs_error);
		}
		, FS_proto = FileSaver.prototype
		, saveAs = function(blob, name) {
			return new FileSaver(blob, name);
		}
	;
	FS_proto.abort = function() {
		var filesaver = this;
		filesaver.readyState = filesaver.DONE;
		dispatch(filesaver, "abort");
	};
	FS_proto.readyState = FS_proto.INIT = 0;
	FS_proto.WRITING = 1;
	FS_proto.DONE = 2;

	FS_proto.error =
	FS_proto.onwritestart =
	FS_proto.onprogress =
	FS_proto.onwrite =
	FS_proto.onabort =
	FS_proto.onerror =
	FS_proto.onwriteend =
		null;

	view.addEventListener("unload", process_deletion_queue, false);
	saveAs.unload = function() {
		process_deletion_queue();
		view.removeEventListener("unload", process_deletion_queue, false);
	};
	return saveAs;
}(
	   typeof self !== "undefined" && self
	|| typeof window !== "undefined" && window
	|| this.content
));
// `self` is undefined in Firefox for Android content script context
// while `this` is nsIContentFrameMessageManager
// with an attribute `content` that corresponds to the window

if (typeof module !== "undefined" && module !== null) {
  module.exports = saveAs;
} else if ((typeof define !== "undefined" && define !== null) && (define.amd != null)) {
  define([], function() {
    return saveAs;
  });
}
