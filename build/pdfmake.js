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

  // copy!
  for (var i = 0; i < end - start; i++)
    target[i + target_start] = this[i + start]
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

},{}],6:[function(_dereq_,module,exports){
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
},{"./zlib":7,"buffer":1}],7:[function(_dereq_,module,exports){
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

}).call(this,_dereq_("/Users/bartoszpampuch/Sources/github/pdfmake/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js"),_dereq_("buffer").Buffer)
},{"/Users/bartoszpampuch/Sources/github/pdfmake/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js":5,"buffer":1}],8:[function(_dereq_,module,exports){
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
      if (val < 0) val += 0x100000000;
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
      if (val < 0) val += 0x10000;
      return this.writeUInt16(val);
    };

    Data.prototype.readString = function(length) {
      var i, ret;
      ret = [];
      for (i = 0; 0 <= length ? i < length : i > length; 0 <= length ? i++ : i--) {
        ret[i] = String.fromCharCode(this.readByte());
      }
      return ret.join('');
    };

    Data.prototype.writeString = function(val) {
      var i, _ref, _results;
      _results = [];
      for (i = 0, _ref = val.length; 0 <= _ref ? i < _ref : i > _ref; 0 <= _ref ? i++ : i--) {
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
      var buf, i;
      buf = [];
      for (i = 0; 0 <= bytes ? i < bytes : i > bytes; 0 <= bytes ? i++ : i--) {
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

},{}],9:[function(_dereq_,module,exports){
(function (Buffer){
(function() {

  /*
  PDFDocument - represents an entire PDF document
  By Devon Govett
  */

  var PDFDocument, PDFObject, PDFObjectStore, PDFPage, PDFReference, fs;

  fs = _dereq_('fs');

  PDFObjectStore = _dereq_('./store');

  PDFObject = _dereq_('./object');

  PDFReference = _dereq_('./reference');

  PDFPage = _dereq_('./page');

  PDFDocument = (function() {
    var mixin;
    var _this = this;

    function PDFDocument(options) {
      var key, val, _ref;
      this.options = options != null ? options : {};
      this.version = 1.3;
      this.compress = true;
      this.store = new PDFObjectStore;
      this.pages = [];
      this.page = null;
      this.initColor();
      this.initVector();
      this.initFonts();
      this.initText();
      this.initImages();
      this._info = this.ref({
        Producer: 'PDFKit',
        Creator: 'PDFKit',
        CreationDate: new Date()
      });
      this.info = this._info.data;
      if (this.options.info) {
        _ref = this.options.info;
        for (key in _ref) {
          val = _ref[key];
          this.info[key] = val;
        }
        delete this.options.info;
      }
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
      if (options == null) options = this.options;
      this.page = new PDFPage(this, options);
      this.store.addPage(this.page);
      this.pages.push(this.page);
      this.x = this.page.margins.left;
      this.y = this.page.margins.top;
      this._ctm = [1, 0, 0, 1, 0, 0];
      this.transform(1, 0, 0, -1, 0, this.page.height);
      return this;
    };

    PDFDocument.prototype.ref = function(data) {
      return this.store.ref(data);
    };

    PDFDocument.prototype.addContent = function(str) {
      this.page.content.add(str);
      return this;
    };

    PDFDocument.prototype.write = function(filename, fn) {
      return this.output(function(out) {
        return fs.writeFile(filename, out, 'binary', fn);
      });
    };

    PDFDocument.prototype.output = function(fn) {
      var _this = this;
      return this.finalize(function() {
        var out;
        out = [];
        _this.generateHeader(out);
        return _this.generateBody(out, function() {
          var k, ret, _i, _len;
          _this.generateXRef(out);
          _this.generateTrailer(out);
          ret = [];
          for (_i = 0, _len = out.length; _i < _len; _i++) {
            k = out[_i];
            ret.push(k + '\n');
          }
          return fn(new Buffer(ret.join(''), 'binary'));
        });
      });
    };

    PDFDocument.prototype.finalize = function(fn) {
      var key, val, _ref;
      var _this = this;
      _ref = this.info;
      for (key in _ref) {
        val = _ref[key];
        if (typeof val === 'string') this.info[key] = PDFObject.s(val, true);
      }
      return this.embedFonts(function() {
        return _this.embedImages(function() {
          var cb, done, page, _i, _len, _ref2, _results;
          done = 0;
          cb = function() {
            if (++done === _this.pages.length) return fn();
          };
          _ref2 = _this.pages;
          _results = [];
          for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
            page = _ref2[_i];
            _results.push(page.finalize(cb));
          }
          return _results;
        });
      });
    };

    PDFDocument.prototype.generateHeader = function(out) {
      out.push("%PDF-" + this.version);
      out.push("%\xFF\xFF\xFF\xFF\n");
      return out;
    };

    PDFDocument.prototype.generateBody = function(out, fn) {
      var id, offset, proceed, ref, refs;
      var _this = this;
      offset = out.join('\n').length + 1;
      refs = (function() {
        var _ref, _results;
        _ref = this.store.objects;
        _results = [];
        for (id in _ref) {
          ref = _ref[id];
          _results.push(ref);
        }
        return _results;
      }).call(this);
      return (proceed = function() {
        if (ref = refs.shift()) {
          return ref.object(_this.compress, function(object) {
            ref.offset = offset;
            out.push(object);
            offset += object.length + 1;
            return proceed();
          });
        } else {
          _this.xref_offset = offset;
          return fn();
        }
      })();
    };

    PDFDocument.prototype.generateXRef = function(out) {
      var id, len, offset, ref, _ref, _results;
      len = this.store.length + 1;
      out.push("xref");
      out.push("0 " + len);
      out.push("0000000000 65535 f ");
      _ref = this.store.objects;
      _results = [];
      for (id in _ref) {
        ref = _ref[id];
        offset = ('0000000000' + ref.offset).slice(-10);
        _results.push(out.push(offset + ' 00000 n '));
      }
      return _results;
    };

    PDFDocument.prototype.generateTrailer = function(out) {
      var trailer;
      trailer = PDFObject.convert({
        Size: this.store.length + 1,
        Root: this.store.root,
        Info: this._info
      });
      out.push('trailer');
      out.push(trailer);
      out.push('startxref');
      out.push(this.xref_offset);
      return out.push('%%EOF');
    };

    PDFDocument.prototype.toString = function() {
      return "[object PDFDocument]";
    };

    return PDFDocument;

  }).call(this);

  module.exports = PDFDocument;

}).call(this);

}).call(this,_dereq_("buffer").Buffer)
},{"./mixins/annotations.js":33,"./mixins/color.js":34,"./mixins/fonts.js":35,"./mixins/images.js":36,"./mixins/text.js":37,"./mixins/vector.js":38,"./object":39,"./page":40,"./reference":42,"./store":43,"buffer":1,"fs":"x/K9gc"}],10:[function(_dereq_,module,exports){
(function (__dirname){
(function() {

  /*
  PDFFont - embeds fonts in PDF documents
  By Devon Govett
  */

  var AFMFont, PDFFont, Subset, TTFFont, zlib;
  var __hasProp = Object.prototype.hasOwnProperty, __indexOf = Array.prototype.indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (__hasProp.call(this, i) && this[i] === item) return i; } return -1; };

  TTFFont = _dereq_('./font/ttf');

  AFMFont = _dereq_('./font/afm');

  Subset = _dereq_('./font/subset');

  zlib = _dereq_('zlib');

  PDFFont = (function() {
    var WIN_ANSI_MAP, encodeWinAnsi, toUnicodeCmap;

    function PDFFont(document, filename, family, id) {
      var _ref;
      this.document = document;
      this.filename = filename;
      this.family = family;
      this.id = id;
      if (_ref = this.filename, __indexOf.call(this._standardFonts, _ref) >= 0) {
        this.embedStandard();
      } else if (/\.(ttf|ttc)$/i.test(this.filename)) {
        this.ttf = TTFFont.open(this.filename, this.family);
        this.subset = new Subset(this.ttf);
        this.registerTTF();
      } else if (/\.dfont$/i.test(this.filename)) {
        this.ttf = TTFFont.fromDFont(this.filename, this.family);
        this.subset = new Subset(this.ttf);
        this.registerTTF();
      } else {
        throw new Error('Not a supported font format or standard PDF font.');
      }
    }

    PDFFont.prototype.use = function(characters) {
      var _ref;
      return (_ref = this.subset) != null ? _ref.use(characters) : void 0;
    };

    PDFFont.prototype.embed = function(fn) {
      if (this.isAFM) return fn();
      return this.embedTTF(fn);
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

    encodeWinAnsi = function(text) {
      var char, i, string, _ref;
      string = '';
      for (i = 0, _ref = text.length; 0 <= _ref ? i < _ref : i > _ref; 0 <= _ref ? i++ : i--) {
        char = text.charCodeAt(i);
        char = WIN_ANSI_MAP[char] || char;
        string += String.fromCharCode(char);
      }
      return string;
    };

    PDFFont.prototype.encode = function(text) {
      var _ref;
      if (this.isAFM) {
        return encodeWinAnsi(text);
      } else {
        return ((_ref = this.subset) != null ? _ref.encodeText(text) : void 0) || text;
      }
    };

    PDFFont.prototype.registerTTF = function() {
      var e, gid, hi, i, low, raw, _ref;
      this.scaleFactor = 1000.0 / this.ttf.head.unitsPerEm;
      this.bbox = (function() {
        var _i, _len, _ref, _results;
        _ref = this.ttf.bbox;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          e = _ref[_i];
          _results.push(Math.round(e * this.scaleFactor));
        }
        return _results;
      }).call(this);
      this.stemV = 0;
      if (this.ttf.post.exists) {
        raw = this.ttf.post.italic_angle;
        hi = raw >> 16;
        low = raw & 0xFF;
        if (hi & 0x8000 !== 0) hi = -((hi ^ 0xFFFF) + 1);
        this.italicAngle = +("" + hi + "." + low);
      } else {
        this.italicAngle = 0;
      }
      this.ascender = Math.round(this.ttf.ascender * this.scaleFactor);
      this.decender = Math.round(this.ttf.decender * this.scaleFactor);
      this.lineGap = Math.round(this.ttf.lineGap * this.scaleFactor);
      this.capHeight = (this.ttf.os2.exists && this.ttf.os2.capHeight) || this.ascender;
      this.xHeight = (this.ttf.os2.exists && this.ttf.os2.xHeight) || 0;
      this.familyClass = (this.ttf.os2.exists && this.ttf.os2.familyClass || 0) >> 8;
      this.isSerif = (_ref = this.familyClass) === 1 || _ref === 2 || _ref === 3 || _ref === 4 || _ref === 5 || _ref === 7;
      this.isScript = this.familyClass === 10;
      this.flags = 0;
      if (this.ttf.post.isFixedPitch) this.flags |= 1 << 0;
      if (this.isSerif) this.flags |= 1 << 1;
      if (this.isScript) this.flags |= 1 << 3;
      if (this.italicAngle !== 0) this.flags |= 1 << 6;
      this.flags |= 1 << 5;
      this.cmap = this.ttf.cmap.unicode;
      if (!this.cmap) throw new Error('No unicode cmap for font');
      this.hmtx = this.ttf.hmtx;
      this.charWidths = (function() {
        var _ref2, _results;
        _ref2 = this.cmap.codeMap;
        _results = [];
        for (i in _ref2) {
          gid = _ref2[i];
          if (i >= 32) {
            _results.push(Math.round(this.hmtx.widths[gid] * this.scaleFactor));
          }
        }
        return _results;
      }).call(this);
      return this.ref = this.document.ref({
        Type: 'Font',
        Subtype: 'TrueType'
      });
    };

    PDFFont.prototype.embedTTF = function(fn) {
      var data;
      var _this = this;
      data = this.subset.encode();
      return zlib.deflate(data, function(err, compressedData) {
        var charWidths, cmap, code, firstChar, glyph, key, ref, val;
        if (err) throw err;
        _this.fontfile = _this.document.ref({
          Length: compressedData.length,
          Length1: data.length,
          Filter: 'FlateDecode'
        });
        _this.fontfile.add(compressedData);
        _this.descriptor = _this.document.ref({
          Type: 'FontDescriptor',
          FontName: _this.subset.postscriptName,
          FontFile2: _this.fontfile,
          FontBBox: _this.bbox,
          Flags: _this.flags,
          StemV: _this.stemV,
          ItalicAngle: _this.italicAngle,
          Ascent: _this.ascender,
          Descent: _this.decender,
          CapHeight: _this.capHeight,
          XHeight: _this.xHeight
        });
        firstChar = +Object.keys(_this.subset.cmap)[0];
        charWidths = (function() {
          var _ref, _results;
          _ref = this.subset.cmap;
          _results = [];
          for (code in _ref) {
            glyph = _ref[code];
            _results.push(Math.round(this.ttf.hmtx.forGlyph(glyph).advance * this.scaleFactor));
          }
          return _results;
        }).call(_this);
        cmap = _this.document.ref();
        cmap.add(toUnicodeCmap(_this.subset.subset));
        ref = {
          Type: 'Font',
          BaseFont: _this.subset.postscriptName,
          Subtype: 'TrueType',
          FontDescriptor: _this.descriptor,
          FirstChar: firstChar,
          LastChar: firstChar + charWidths.length - 1,
          Widths: _this.document.ref(charWidths),
          Encoding: 'MacRomanEncoding',
          ToUnicode: cmap
        };
        for (key in ref) {
          val = ref[key];
          _this.ref.data[key] = val;
        }
        return cmap.finalize(_this.document.compress, fn);
      });
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

    PDFFont.prototype.embedStandard = function() {
      var font;
      this.isAFM = true;
      font = AFMFont.open(__dirname + ("/font/data/" + this.filename + ".afm"));
      this.ascender = font.ascender, this.decender = font.decender, this.bbox = font.bbox, this.lineGap = font.lineGap, this.charWidths = font.charWidths;
      return this.ref = this.document.ref({
        Type: 'Font',
        BaseFont: this.filename,
        Subtype: 'Type1',
        Encoding: 'WinAnsiEncoding'
      });
    };

    PDFFont.prototype._standardFonts = ["Courier", "Courier-Bold", "Courier-Oblique", "Courier-BoldOblique", "Helvetica", "Helvetica-Bold", "Helvetica-Oblique", "Helvetica-BoldOblique", "Times-Roman", "Times-Bold", "Times-Italic", "Times-BoldItalic", "Symbol", "ZapfDingbats"];

    PDFFont.prototype.widthOfString = function(string, size) {
      var charCode, i, scale, width, _ref;
      string = '' + string;
      width = 0;
      for (i = 0, _ref = string.length; 0 <= _ref ? i < _ref : i > _ref; 0 <= _ref ? i++ : i--) {
        charCode = string.charCodeAt(i) - (this.isAFM ? 0 : 32);
        width += this.charWidths[charCode] || 0;
      }
      scale = size / 1000;
      return width * scale;
    };

    PDFFont.prototype.lineHeight = function(size, includeGap) {
      var gap;
      if (includeGap == null) includeGap = false;
      gap = includeGap ? this.lineGap : 0;
      return (this.ascender + gap - this.decender) / 1000 * size;
    };

    return PDFFont;

  })();

  module.exports = PDFFont;

}).call(this);

}).call(this,"/../node_modules/pdfkit/js")
},{"./font/afm":11,"./font/subset":14,"./font/ttf":26,"zlib":6}],11:[function(_dereq_,module,exports){
(function() {
  var AFMFont, fs;

  fs = _dereq_('fs');

  AFMFont = (function() {
    var characters;

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
        var _results;
        _results = [];
        for (i = 0; i <= 255; i++) {
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
      var a, key, line, match, name, section, value, _i, _len, _ref, _results;
      section = '';
      _ref = this.contents.split('\n');
      _results = [];
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
              if (!Array.isArray(a)) a = this.attributes[key] = [a];
              _results.push(a.push(value));
            } else {
              _results.push(this.attributes[key] = value);
            }
            break;
          case 'CharMetrics':
            if (!/^CH?\s/.test(line)) continue;
            name = line.match(/\bN\s+(\.?\w+)\s*;/)[1];
            _results.push(this.glyphWidths[name] = +line.match(/\bWX\s+(\d+)\s*;/)[1]);
            break;
          default:
            _results.push(void 0);
        }
      }
      return _results;
    };

    characters = '.notdef       .notdef        .notdef        .notdef\n.notdef       .notdef        .notdef        .notdef\n.notdef       .notdef        .notdef        .notdef\n.notdef       .notdef        .notdef        .notdef\n.notdef       .notdef        .notdef        .notdef\n.notdef       .notdef        .notdef        .notdef\n.notdef       .notdef        .notdef        .notdef\n.notdef       .notdef        .notdef        .notdef\n\nspace         exclam         quotedbl       numbersign\ndollar        percent        ampersand      quotesingle\nparenleft     parenright     asterisk       plus\ncomma         hyphen         period         slash\nzero          one            two            three\nfour          five           six            seven\neight         nine           colon          semicolon\nless          equal          greater        question\n\nat            A              B              C\nD             E              F              G\nH             I              J              K\nL             M              N              O\nP             Q              R              S\nT             U              V              W\nX             Y              Z              bracketleft\nbackslash     bracketright   asciicircum    underscore\n\ngrave         a              b              c\nd             e              f              g\nh             i              j              k\nl             m              n              o\np             q              r              s\nt             u              v              w\nx             y              z              braceleft\nbar           braceright     asciitilde     .notdef\n\nEuro          .notdef        quotesinglbase florin\nquotedblbase  ellipsis       dagger         daggerdbl\ncircumflex    perthousand    Scaron         guilsinglleft\nOE            .notdef        Zcaron         .notdef\n.notdef       quoteleft      quoteright     quotedblleft\nquotedblright bullet         endash         emdash\ntilde         trademark      scaron         guilsinglright\noe            .notdef        zcaron         ydieresis\n\nspace         exclamdown     cent           sterling\ncurrency      yen            brokenbar      section\ndieresis      copyright      ordfeminine    guillemotleft\nlogicalnot    hyphen         registered     macron\ndegree        plusminus      twosuperior    threesuperior\nacute         mu             paragraph      periodcentered\ncedilla       onesuperior    ordmasculine   guillemotright\nonequarter    onehalf        threequarters  questiondown\n\nAgrave        Aacute         Acircumflex    Atilde\nAdieresis     Aring          AE             Ccedilla\nEgrave        Eacute         Ecircumflex    Edieresis\nIgrave        Iacute         Icircumflex    Idieresis\nEth           Ntilde         Ograve         Oacute\nOcircumflex   Otilde         Odieresis      multiply\nOslash        Ugrave         Uacute         Ucircumflex\nUdieresis     Yacute         Thorn          germandbls\n\nagrave        aacute         acircumflex    atilde\nadieresis     aring          ae             ccedilla\negrave        eacute         ecircumflex    edieresis\nigrave        iacute         icircumflex    idieresis\neth           ntilde         ograve         oacute\nocircumflex   otilde         odieresis      divide\noslash        ugrave         uacute         ucircumflex\nudieresis     yacute         thorn          ydieresis'.split(/\s+/);

    return AFMFont;

  })();

  module.exports = AFMFont;

}).call(this);

},{"fs":"x/K9gc"}],12:[function(_dereq_,module,exports){
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
      var attr, b2, b3, b4, dataLength, dataOffset, dataOfs, entry, font, handle, i, id, j, len, length, mapLength, mapOffset, maxIndex, maxTypeIndex, name, nameListOffset, nameOfs, p, pos, refListOffset, type, typeListOffset;
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
      for (i = 0; i <= maxIndex; i += 1) {
        type = data.readString(4);
        maxTypeIndex = data.readShort();
        refListOffset = data.readShort();
        this.map[type] = {
          list: [],
          named: {}
        };
        pos = data.pos;
        data.pos = typeListOffset + refListOffset;
        for (j = 0; j <= maxTypeIndex; j += 1) {
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
          if (entry.name) this.map[type].named[entry.name] = entry;
        }
        data.pos = pos;
      }
    };

    DFont.prototype.getNamedFont = function(name) {
      var data, entry, length, pos, ret;
      data = this.contents;
      pos = data.pos;
      entry = this.map.sfnt.named[name];
      if (!entry) throw new Error("Font " + name + " not found in DFont file.");
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

},{"../data":8,"./directory":13,"./tables/name":23,"fs":"x/K9gc"}],13:[function(_dereq_,module,exports){
(function (Buffer){
(function() {
  var Data, Directory;
  var __slice = Array.prototype.slice;

  Data = _dereq_('../data');

  Directory = (function() {
    var checksum;

    function Directory(data) {
      var entry, i, _ref;
      this.scalarType = data.readInt();
      this.tableCount = data.readShort();
      this.searchRange = data.readShort();
      this.entrySelector = data.readShort();
      this.rangeShift = data.readShort();
      this.tables = {};
      for (i = 0, _ref = this.tableCount; 0 <= _ref ? i < _ref : i > _ref; 0 <= _ref ? i++ : i--) {
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
        if (tag === 'head') headOffset = offset;
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
      var i, sum, tmp, _ref;
      data = __slice.call(data);
      while (data.length % 4) {
        data.push(0);
      }
      tmp = new Data(data);
      sum = 0;
      for (i = 0, _ref = data.length; i < _ref; i += 4) {
        sum += tmp.readUInt32();
      }
      return sum & 0xFFFFFFFF;
    };

    return Directory;

  })();

  module.exports = Directory;

}).call(this);

}).call(this,_dereq_("buffer").Buffer)
},{"../data":8,"buffer":1}],14:[function(_dereq_,module,exports){
(function() {
  var CmapTable, Subset, utils;
  var __hasProp = Object.prototype.hasOwnProperty, __indexOf = Array.prototype.indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (__hasProp.call(this, i) && this[i] === item) return i; } return -1; };

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
      var i, _ref;
      if (typeof character === 'string') {
        for (i = 0, _ref = character.length; 0 <= _ref ? i < _ref : i > _ref; 0 <= _ref ? i++ : i--) {
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
      var char, i, string, _ref;
      string = '';
      for (i = 0, _ref = text.length; 0 <= _ref ? i < _ref : i > _ref; 0 <= _ref ? i++ : i--) {
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
        if ((val != null) && __indexOf.call(ret, val) < 0) ret.push(val);
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
      var cmap, code, glyf, glyphs, id, ids, loca, name, new2old, newIDs, nextGlyphID, old2new, oldID, oldIDs, tables, _ref, _ref2;
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
        if (!(oldID in old2new)) old2new[oldID] = nextGlyphID++;
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
      _ref2 = cmap.charMap;
      for (code in _ref2) {
        ids = _ref2[code];
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
      if (this.font.os2.exists) tables['OS/2'] = this.font.os2.raw();
      return this.font.directory.encode(tables);
    };

    return Subset;

  })();

  module.exports = Subset;

}).call(this);

},{"./tables/cmap":16,"./utils":27}],15:[function(_dereq_,module,exports){
(function() {
  var Table;

  Table = (function() {

    function Table(file, tag) {
      var info, _ref;
      this.file = file;
      this.tag = tag;
      if ((_ref = this.tag) == null) {
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
      if (!this.exists) return null;
      this.file.contents.pos = this.offset;
      return this.file.contents.read(this.length);
    };

    return Table;

  })();

  module.exports = Table;

}).call(this);

},{}],16:[function(_dereq_,module,exports){
(function() {
  var CmapEntry, CmapTable, Data, Table;
  var __hasProp = Object.prototype.hasOwnProperty, __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

  Table = _dereq_('../table');

  Data = _dereq_('../../data');

  CmapTable = (function() {

    __extends(CmapTable, Table);

    function CmapTable() {
      CmapTable.__super__.constructor.apply(this, arguments);
    }

    CmapTable.prototype.parse = function(data) {
      var entry, i, tableCount, _ref;
      data.pos = this.offset;
      this.version = data.readUInt16();
      tableCount = data.readUInt16();
      this.tables = [];
      this.unicode = null;
      for (i = 0; 0 <= tableCount ? i < tableCount : i > tableCount; 0 <= tableCount ? i++ : i--) {
        entry = new CmapEntry(data, this.offset);
        this.tables.push(entry);
        if (entry.isUnicode) {
          if ((_ref = this.unicode) == null) this.unicode = entry;
        }
      }
      return true;
    };

    CmapTable.encode = function(charmap, encoding) {
      var result, table;
      if (encoding == null) encoding = 'macroman';
      result = CmapEntry.encode(charmap, encoding);
      table = new Data;
      table.writeUInt16(0);
      table.writeUInt16(1);
      result.table = table.data.concat(result.subtable);
      return result;
    };

    return CmapTable;

  })();

  CmapEntry = (function() {

    function CmapEntry(data, offset) {
      var code, count, endCode, glyphId, glyphIds, i, idDelta, idRangeOffset, index, segCount, segCountX2, start, startCode, tail, _len;
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
          for (i = 0; i < 256; i++) {
            this.codeMap[i] = data.readByte();
          }
          break;
        case 4:
          segCountX2 = data.readUInt16();
          segCount = segCountX2 / 2;
          data.pos += 6;
          endCode = (function() {
            var _results;
            _results = [];
            for (i = 0; 0 <= segCount ? i < segCount : i > segCount; 0 <= segCount ? i++ : i--) {
              _results.push(data.readUInt16());
            }
            return _results;
          })();
          data.pos += 2;
          startCode = (function() {
            var _results;
            _results = [];
            for (i = 0; 0 <= segCount ? i < segCount : i > segCount; 0 <= segCount ? i++ : i--) {
              _results.push(data.readUInt16());
            }
            return _results;
          })();
          idDelta = (function() {
            var _results;
            _results = [];
            for (i = 0; 0 <= segCount ? i < segCount : i > segCount; 0 <= segCount ? i++ : i--) {
              _results.push(data.readUInt16());
            }
            return _results;
          })();
          idRangeOffset = (function() {
            var _results;
            _results = [];
            for (i = 0; 0 <= segCount ? i < segCount : i > segCount; 0 <= segCount ? i++ : i--) {
              _results.push(data.readUInt16());
            }
            return _results;
          })();
          count = this.length - data.pos + this.offset;
          glyphIds = (function() {
            var _results;
            _results = [];
            for (i = 0; 0 <= count ? i < count : i > count; 0 <= count ? i++ : i--) {
              _results.push(data.readUInt16());
            }
            return _results;
          })();
          for (i = 0, _len = endCode.length; i < _len; i++) {
            tail = endCode[i];
            start = startCode[i];
            for (code = start; start <= tail ? code <= tail : code >= tail; start <= tail ? code++ : code--) {
              if (idRangeOffset[i] === 0) {
                glyphId = code + idDelta[i];
              } else {
                index = idRangeOffset[i] / 2 + (code - start) - (segCount - i);
                glyphId = glyphIds[index] || 0;
                if (glyphId !== 0) glyphId += idDelta[i];
              }
              this.codeMap[code] = glyphId & 0xFFFF;
            }
          }
      }
    }

    CmapEntry.encode = function(charmap, encoding) {
      var charMap, code, codeMap, codes, delta, deltas, diff, endCode, endCodes, entrySelector, glyphIDs, i, id, indexes, last, map, nextID, offset, old, rangeOffsets, rangeShift, result, searchRange, segCount, segCountX2, startCode, startCodes, startGlyph, subtable, _i, _j, _k, _l, _len, _len2, _len3, _len4, _len5, _len6, _len7, _len8, _m, _n, _name, _o, _ref, _ref2;
      subtable = new Data;
      codes = Object.keys(charmap).sort(function(a, b) {
        return a - b;
      });
      switch (encoding) {
        case 'macroman':
          id = 0;
          indexes = (function() {
            var _results;
            _results = [];
            for (i = 0; i < 256; i++) {
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
            if ((_ref = map[_name = charmap[code]]) == null) map[_name] = ++id;
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
          for (_j = 0, _len2 = codes.length; _j < _len2; _j++) {
            code = codes[_j];
            old = charmap[code];
            if ((_ref2 = map[old]) == null) map[old] = ++nextID;
            charMap[code] = {
              old: old,
              "new": map[old]
            };
            delta = map[old] - code;
            if (!(last != null) || delta !== diff) {
              if (last) endCodes.push(last);
              startCodes.push(code);
              diff = delta;
            }
            last = code;
          }
          if (last) endCodes.push(last);
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
          for (i = 0, _len3 = startCodes.length; i < _len3; i++) {
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
              for (code = startCode; startCode <= endCode ? code <= endCode : code >= endCode; startCode <= endCode ? code++ : code--) {
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
          for (_k = 0, _len4 = endCodes.length; _k < _len4; _k++) {
            code = endCodes[_k];
            subtable.writeUInt16(code);
          }
          subtable.writeUInt16(0);
          for (_l = 0, _len5 = startCodes.length; _l < _len5; _l++) {
            code = startCodes[_l];
            subtable.writeUInt16(code);
          }
          for (_m = 0, _len6 = deltas.length; _m < _len6; _m++) {
            delta = deltas[_m];
            subtable.writeUInt16(delta);
          }
          for (_n = 0, _len7 = rangeOffsets.length; _n < _len7; _n++) {
            offset = rangeOffsets[_n];
            subtable.writeUInt16(offset);
          }
          for (_o = 0, _len8 = glyphIDs.length; _o < _len8; _o++) {
            id = glyphIDs[_o];
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

},{"../../data":8,"../table":15}],17:[function(_dereq_,module,exports){
(function() {
  var CompoundGlyph, Data, GlyfTable, SimpleGlyph, Table;
  var __hasProp = Object.prototype.hasOwnProperty, __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; }, __slice = Array.prototype.slice;

  Table = _dereq_('../table');

  Data = _dereq_('../../data');

  GlyfTable = (function() {

    __extends(GlyfTable, Table);

    function GlyfTable() {
      GlyfTable.__super__.constructor.apply(this, arguments);
    }

    GlyfTable.prototype.parse = function(data) {
      return this.cache = {};
    };

    GlyfTable.prototype.glyphFor = function(id) {
      var data, index, length, loca, numberOfContours, raw, xMax, xMin, yMax, yMin;
      if (id in this.cache) return this.cache[id];
      loca = this.file.loca;
      data = this.file.contents;
      index = loca.indexOf(id);
      length = loca.lengthOf(id);
      if (length === 0) return this.cache[id] = null;
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
        if (glyph) table = table.concat(glyph.encode(old2new));
      }
      offsets.push(table.length);
      return {
        table: table,
        offsets: offsets
      };
    };

    return GlyfTable;

  })();

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
        if (!(flags & MORE_COMPONENTS)) break;
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
      var i, id, result, _len, _ref;
      result = new Data(__slice.call(this.raw.data));
      _ref = this.glyphIDs;
      for (i = 0, _len = _ref.length; i < _len; i++) {
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

},{"../../data":8,"../table":15}],18:[function(_dereq_,module,exports){
(function() {
  var Data, HeadTable, Table;
  var __hasProp = Object.prototype.hasOwnProperty, __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

  Table = _dereq_('../table');

  Data = _dereq_('../../data');

  HeadTable = (function() {

    __extends(HeadTable, Table);

    function HeadTable() {
      HeadTable.__super__.constructor.apply(this, arguments);
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

  })();

  module.exports = HeadTable;

}).call(this);

},{"../../data":8,"../table":15}],19:[function(_dereq_,module,exports){
(function() {
  var Data, HheaTable, Table;
  var __hasProp = Object.prototype.hasOwnProperty, __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

  Table = _dereq_('../table');

  Data = _dereq_('../../data');

  HheaTable = (function() {

    __extends(HheaTable, Table);

    function HheaTable() {
      HheaTable.__super__.constructor.apply(this, arguments);
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
      var i, table, _ref;
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
      for (i = 0, _ref = 4 * 2; 0 <= _ref ? i < _ref : i > _ref; 0 <= _ref ? i++ : i--) {
        table.writeByte(0);
      }
      table.writeShort(this.metricDataFormat);
      table.writeUInt16(ids.length);
      return table.data;
    };

    return HheaTable;

  })();

  module.exports = HheaTable;

}).call(this);

},{"../../data":8,"../table":15}],20:[function(_dereq_,module,exports){
(function() {
  var Data, HmtxTable, Table;
  var __hasProp = Object.prototype.hasOwnProperty, __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

  Table = _dereq_('../table');

  Data = _dereq_('../../data');

  HmtxTable = (function() {

    __extends(HmtxTable, Table);

    function HmtxTable() {
      HmtxTable.__super__.constructor.apply(this, arguments);
    }

    HmtxTable.prototype.parse = function(data) {
      var i, last, lsbCount, m, _ref, _results;
      data.pos = this.offset;
      this.metrics = [];
      for (i = 0, _ref = this.file.hhea.numberOfMetrics; 0 <= _ref ? i < _ref : i > _ref; 0 <= _ref ? i++ : i--) {
        this.metrics.push({
          advance: data.readUInt16(),
          lsb: data.readInt16()
        });
      }
      lsbCount = this.file.maxp.numGlyphs - this.file.hhea.numberOfMetrics;
      this.leftSideBearings = (function() {
        var _results;
        _results = [];
        for (i = 0; 0 <= lsbCount ? i < lsbCount : i > lsbCount; 0 <= lsbCount ? i++ : i--) {
          _results.push(data.readInt16());
        }
        return _results;
      })();
      this.widths = (function() {
        var _i, _len, _ref2, _results;
        _ref2 = this.metrics;
        _results = [];
        for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
          m = _ref2[_i];
          _results.push(m.advance);
        }
        return _results;
      }).call(this);
      last = this.widths[this.widths.length - 1];
      _results = [];
      for (i = 0; 0 <= lsbCount ? i < lsbCount : i > lsbCount; 0 <= lsbCount ? i++ : i--) {
        _results.push(this.widths.push(last));
      }
      return _results;
    };

    HmtxTable.prototype.forGlyph = function(id) {
      var metrics;
      if (id in this.metrics) return this.metrics[id];
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

  })();

  module.exports = HmtxTable;

}).call(this);

},{"../../data":8,"../table":15}],21:[function(_dereq_,module,exports){
(function() {
  var Data, LocaTable, Table;
  var __hasProp = Object.prototype.hasOwnProperty, __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

  Table = _dereq_('../table');

  Data = _dereq_('../../data');

  LocaTable = (function() {

    __extends(LocaTable, Table);

    function LocaTable() {
      LocaTable.__super__.constructor.apply(this, arguments);
    }

    LocaTable.prototype.parse = function(data) {
      var format, i;
      data.pos = this.offset;
      format = this.file.head.indexToLocFormat;
      if (format === 0) {
        return this.offsets = (function() {
          var _ref, _results;
          _results = [];
          for (i = 0, _ref = this.length; i < _ref; i += 2) {
            _results.push(data.readUInt16() * 2);
          }
          return _results;
        }).call(this);
      } else {
        return this.offsets = (function() {
          var _ref, _results;
          _results = [];
          for (i = 0, _ref = this.length; i < _ref; i += 4) {
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
      var o, offset, ret, table, _i, _j, _k, _len, _len2, _len3, _ref;
      table = new Data;
      for (_i = 0, _len = offsets.length; _i < _len; _i++) {
        offset = offsets[_i];
        if (!(offset > 0xFFFF)) continue;
        _ref = this.offsets;
        for (_j = 0, _len2 = _ref.length; _j < _len2; _j++) {
          o = _ref[_j];
          table.writeUInt32(o);
        }
        return ret = {
          format: 1,
          table: table.data
        };
      }
      for (_k = 0, _len3 = offsets.length; _k < _len3; _k++) {
        o = offsets[_k];
        table.writeUInt16(o / 2);
      }
      return ret = {
        format: 0,
        table: table.data
      };
    };

    return LocaTable;

  })();

  module.exports = LocaTable;

}).call(this);

},{"../../data":8,"../table":15}],22:[function(_dereq_,module,exports){
(function() {
  var Data, MaxpTable, Table;
  var __hasProp = Object.prototype.hasOwnProperty, __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

  Table = _dereq_('../table');

  Data = _dereq_('../../data');

  MaxpTable = (function() {

    __extends(MaxpTable, Table);

    function MaxpTable() {
      MaxpTable.__super__.constructor.apply(this, arguments);
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

  })();

  module.exports = MaxpTable;

}).call(this);

},{"../../data":8,"../table":15}],23:[function(_dereq_,module,exports){
(function() {
  var Data, NameEntry, NameTable, Table, utils;
  var __hasProp = Object.prototype.hasOwnProperty, __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

  Table = _dereq_('../table');

  Data = _dereq_('../../data');

  utils = _dereq_('../utils');

  NameTable = (function() {
    var subsetTag;

    __extends(NameTable, Table);

    function NameTable() {
      NameTable.__super__.constructor.apply(this, arguments);
    }

    NameTable.prototype.parse = function(data) {
      var count, entries, entry, format, i, name, stringOffset, strings, text, _len, _name, _ref;
      data.pos = this.offset;
      format = data.readShort();
      count = data.readShort();
      stringOffset = data.readShort();
      entries = [];
      for (i = 0; 0 <= count ? i < count : i > count; 0 <= count ? i++ : i--) {
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
      for (i = 0, _len = entries.length; i < _len; i++) {
        entry = entries[i];
        data.pos = entry.offset;
        text = data.readString(entry.length);
        name = new NameEntry(text, entry);
        if ((_ref = strings[_name = entry.nameID]) == null) strings[_name] = [];
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
        if (list != null) strCount += list.length;
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

  })();

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

},{"../../data":8,"../table":15,"../utils":27}],24:[function(_dereq_,module,exports){
(function() {
  var OS2Table, Table;
  var __hasProp = Object.prototype.hasOwnProperty, __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

  Table = _dereq_('../table');

  OS2Table = (function() {

    __extends(OS2Table, Table);

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
        var _results;
        _results = [];
        for (i = 0; i < 10; i++) {
          _results.push(data.readByte());
        }
        return _results;
      })();
      this.charRange = (function() {
        var _results;
        _results = [];
        for (i = 0; i < 4; i++) {
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
          var _results;
          _results = [];
          for (i = 0; i < 2; i++) {
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

  })();

  module.exports = OS2Table;

}).call(this);

},{"../table":15}],25:[function(_dereq_,module,exports){
(function() {
  var Data, PostTable, Table;
  var __hasProp = Object.prototype.hasOwnProperty, __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

  Table = _dereq_('../table');

  Data = _dereq_('../../data');

  PostTable = (function() {
    var POSTSCRIPT_GLYPHS;

    __extends(PostTable, Table);

    function PostTable() {
      PostTable.__super__.constructor.apply(this, arguments);
    }

    PostTable.prototype.parse = function(data) {
      var i, length, numberOfGlyphs, _results;
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
          for (i = 0; 0 <= numberOfGlyphs ? i < numberOfGlyphs : i > numberOfGlyphs; 0 <= numberOfGlyphs ? i++ : i--) {
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
            var _ref, _results2;
            _results2 = [];
            for (i = 0, _ref = this.file.maxp.numGlyphs; 0 <= _ref ? i < _ref : i > _ref; 0 <= _ref ? i++ : i--) {
              _results2.push(data.readUInt32());
            }
            return _results2;
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
      var id, index, indexes, position, post, raw, string, strings, table, _i, _j, _k, _len, _len2, _len3;
      if (!this.exists) return null;
      raw = this.raw();
      if (this.format === 0x00030000) return raw;
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
      for (_j = 0, _len2 = indexes.length; _j < _len2; _j++) {
        index = indexes[_j];
        table.writeUInt16(index);
      }
      for (_k = 0, _len3 = strings.length; _k < _len3; _k++) {
        string = strings[_k];
        table.writeByte(string.length);
        table.writeString(string);
      }
      return table.data;
    };

    POSTSCRIPT_GLYPHS = '.notdef .null nonmarkingreturn space exclam quotedbl numbersign dollar percent\nampersand quotesingle parenleft parenright asterisk plus comma hyphen period slash\nzero one two three four five six seven eight nine colon semicolon less equal greater\nquestion at A B C D E F G H I J K L M N O P Q R S T U V W X Y Z\nbracketleft backslash bracketright asciicircum underscore grave\na b c d e f g h i j k l m n o p q r s t u v w x y z\nbraceleft bar braceright asciitilde Adieresis Aring Ccedilla Eacute Ntilde Odieresis\nUdieresis aacute agrave acircumflex adieresis atilde aring ccedilla eacute egrave\necircumflex edieresis iacute igrave icircumflex idieresis ntilde oacute ograve\nocircumflex odieresis otilde uacute ugrave ucircumflex udieresis dagger degree cent\nsterling section bullet paragraph germandbls registered copyright trademark acute\ndieresis notequal AE Oslash infinity plusminus lessequal greaterequal yen mu\npartialdiff summation product pi integral ordfeminine ordmasculine Omega ae oslash\nquestiondown exclamdown logicalnot radical florin approxequal Delta guillemotleft\nguillemotright ellipsis nonbreakingspace Agrave Atilde Otilde OE oe endash emdash\nquotedblleft quotedblright quoteleft quoteright divide lozenge ydieresis Ydieresis\nfraction currency guilsinglleft guilsinglright fi fl daggerdbl periodcentered\nquotesinglbase quotedblbase perthousand Acircumflex Ecircumflex Aacute Edieresis\nEgrave Iacute Icircumflex Idieresis Igrave Oacute Ocircumflex apple Ograve Uacute\nUcircumflex Ugrave dotlessi circumflex tilde macron breve dotaccent ring cedilla\nhungarumlaut ogonek caron Lslash lslash Scaron scaron Zcaron zcaron brokenbar Eth\neth Yacute yacute Thorn thorn minus multiply onesuperior twosuperior threesuperior\nonehalf onequarter threequarters franc Gbreve gbreve Idotaccent Scedilla scedilla\nCacute cacute Ccaron ccaron dcroat'.split(/\s+/g);

    return PostTable;

  })();

  module.exports = PostTable;

}).call(this);

},{"../../data":8,"../table":15}],26:[function(_dereq_,module,exports){
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
      var data, i, numFonts, offset, offsets, version, _len;
      this.rawData = rawData;
      data = this.contents = new Data(rawData);
      if (data.readString(4) === 'ttcf') {
        if (!name) throw new Error("Must specify a font name for TTC files.");
        version = data.readInt();
        numFonts = data.readInt();
        offsets = [];
        for (i = 0; 0 <= numFonts ? i < numFonts : i > numFonts; 0 <= numFonts ? i++ : i--) {
          offsets[i] = data.readInt();
        }
        for (i = 0, _len = offsets.length; i < _len; i++) {
          offset = offsets[i];
          data.pos = offset;
          this.parse();
          if (this.name.postscriptName === name) return;
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

    return TTFFont;

  })();

  module.exports = TTFFont;

}).call(this);

},{"../data":8,"./dfont":12,"./directory":13,"./tables/cmap":16,"./tables/glyf":17,"./tables/head":18,"./tables/hhea":19,"./tables/hmtx":20,"./tables/loca":21,"./tables/maxp":22,"./tables/name":23,"./tables/os2":24,"./tables/post":25,"fs":"x/K9gc"}],27:[function(_dereq_,module,exports){

  /*
  # An implementation of Ruby's string.succ method.
  # By Devon Govett
  #
  # Returns the successor to str. The successor is calculated by incrementing characters starting 
  # from the rightmost alphanumeric (or the rightmost character if there are no alphanumerics) in the
  # string. Incrementing a digit always results in another digit, and incrementing a letter results in
  # another letter of the same case.
  #
  # If the increment generates a carry, the character to the left of it is incremented. This 
  # process repeats until there is no carry, adding an additional character if necessary.
  #
  # succ("abcd")      == "abce"
  # succ("THX1138")   == "THX1139"
  # succ("<<koala>>") == "<<koalb>>"
  # succ("1999zzz")   == "2000aaa"
  # succ("ZZZ9999")   == "AAAA0000"
  */

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
          if (isUpperCase) next = next.toUpperCase();
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
        if (carry) next = 0;
        if (carry && i === 0) {
          result = '1' + next + result.slice(1);
          break;
        }
      }
      result = result.slice(0, i) + next + result.slice(i + 1);
      if (!carry) break;
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

},{}],28:[function(_dereq_,module,exports){
(function() {
  var PDFGradient, PDFLinearGradient, PDFRadialGradient;
  var __hasProp = Object.prototype.hasOwnProperty, __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

  PDFGradient = (function() {

    function PDFGradient(doc) {
      this.doc = doc;
      this.stops = [];
      this.embedded = false;
      this.transform = [1, 0, 0, 1, 0, 0];
    }

    PDFGradient.prototype.stop = function(pos, color, opacity) {
      if (opacity == null) opacity = 1;
      opacity = Math.max(0, Math.min(1, opacity));
      this.stops.push([pos, this.doc._normalizeColor(color), opacity]);
      return this;
    };

    PDFGradient.prototype.embed = function() {
      var bounds, dx, dy, encode, fn, form, grad, group, gstate, i, last, m, m0, m1, m11, m12, m2, m21, m22, m3, m4, m5, name, pattern, sMask, stop, stops, v, _i, _len, _ref, _ref2, _ref3;
      if (this.embedded || this.stops.length === 0) return;
      this.embedded = true;
      last = this.stops[this.stops.length - 1];
      if (last[0] < 1) this.stops.push([1, last[1], last[2]]);
      bounds = [];
      encode = [];
      stops = [];
      for (i = 0, _ref = this.stops.length - 1; 0 <= _ref ? i < _ref : i > _ref; 0 <= _ref ? i++ : i--) {
        encode.push(0, 1);
        if (i + 2 !== this.stops.length) bounds.push(this.stops[i + 1][0]);
        fn = this.doc.ref({
          FunctionType: 2,
          Domain: [0, 1],
          C0: this.stops[i + 0][1],
          C1: this.stops[i + 1][1],
          N: 1
        });
        stops.push(fn);
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
      }
      this.id = 'Sh' + (++this.doc._gradCount);
      m = this.doc._ctm.slice();
      m0 = m[0], m1 = m[1], m2 = m[2], m3 = m[3], m4 = m[4], m5 = m[5];
      _ref2 = this.transform, m11 = _ref2[0], m12 = _ref2[1], m21 = _ref2[2], m22 = _ref2[3], dx = _ref2[4], dy = _ref2[5];
      m[0] = m0 * m11 + m2 * m12;
      m[1] = m1 * m11 + m3 * m12;
      m[2] = m0 * m21 + m2 * m22;
      m[3] = m1 * m21 + m3 * m22;
      m[4] = m0 * dx + m2 * dy + m4;
      m[5] = m1 * dx + m3 * dy + m5;
      pattern = this.doc.ref({
        Type: 'Pattern',
        PatternType: 2,
        Shading: this.shader(fn),
        Matrix: (function() {
          var _i, _len, _results;
          _results = [];
          for (_i = 0, _len = m.length; _i < _len; _i++) {
            v = m[_i];
            _results.push(+v.toFixed(5));
          }
          return _results;
        })()
      });
      this.doc.page.patterns[this.id] = pattern;
      if (this.stops.some(function(stop) {
        return stop[2] < 1;
      })) {
        grad = this.opacityGradient();
        _ref3 = this.stops;
        for (_i = 0, _len = _ref3.length; _i < _len; _i++) {
          stop = _ref3[_i];
          grad.stop(stop[0], [stop[2]]);
        }
        grad = grad.embed();
        grad.data.Shading.data.ColorSpace = 'DeviceGray';
        group = this.doc.ref({
          Type: 'Group',
          S: 'Transparency',
          CS: 'DeviceGray'
        });
        form = this.doc.ref({
          Type: 'XObject',
          Subtype: 'Form',
          FormType: 1,
          BBox: [0, 0, this.doc.page.width, this.doc.page.height],
          Group: group,
          Resources: this.doc.ref({
            ProcSet: ['PDF', 'Text', 'ImageB', 'ImageC', 'ImageI'],
            Shading: {
              Sh1: grad.data.Shading
            }
          })
        });
        form.add("/Sh1 sh");
        sMask = this.doc.ref({
          Type: 'Mask',
          S: 'Luminosity',
          G: form
        });
        gstate = this.doc.ref({
          Type: 'ExtGState',
          SMask: sMask
        });
        this.opacity_id = ++this.doc._opacityCount;
        name = "Gs" + this.opacity_id;
        this.doc.page.ext_gstates[name] = gstate;
      }
      return pattern;
    };

    PDFGradient.prototype.apply = function(op) {
      if (!this.embedded) this.embed();
      this.doc.addContent("/" + this.id + " " + op);
      if (this.opacity_id) {
        this.doc.save();
        this.doc.addContent("/Gs" + this.opacity_id + " gs");
        return this.doc._sMasked = true;
      }
    };

    return PDFGradient;

  })();

  PDFLinearGradient = (function() {

    __extends(PDFLinearGradient, PDFGradient);

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
        ColorSpace: 'DeviceRGB',
        Coords: [this.x1, this.y1, this.x2, this.y2],
        Function: fn,
        Extend: [true, true]
      });
    };

    PDFLinearGradient.prototype.opacityGradient = function() {
      return new PDFLinearGradient(this.doc, this.x1, this.y1, this.x2, this.y2);
    };

    return PDFLinearGradient;

  })();

  PDFRadialGradient = (function() {

    __extends(PDFRadialGradient, PDFGradient);

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
        ColorSpace: 'DeviceRGB',
        Coords: [this.x1, this.y1, this.r1, this.x2, this.y2, this.r2],
        Function: fn,
        Extend: [true, true]
      });
    };

    PDFRadialGradient.prototype.opacityGradient = function() {
      return new PDFRadialGradient(this.doc, this.x1, this.y1, this.r1, this.x2, this.y2, this.r2);
    };

    return PDFRadialGradient;

  })();

  module.exports = {
    PDFGradient: PDFGradient,
    PDFLinearGradient: PDFLinearGradient,
    PDFRadialGradient: PDFRadialGradient
  };

}).call(this);

},{}],29:[function(_dereq_,module,exports){
(function (Buffer){
(function() {

  /*
  PDFImage - embeds images in PDF documents
  By Devon Govett
  */

  var Data, JPEG, PDFImage, PNG, fs;

  fs = _dereq_('fs');

  Data = _dereq_('./data');

  JPEG = _dereq_('./image/jpeg');

  PNG = _dereq_('./image/png');

  PDFImage = (function() {

    function PDFImage() {}

    PDFImage.open = function(filenameOrBuffer) {
      var data, firstByte;
      if (typeof filenameOrBuffer === 'object' && filenameOrBuffer instanceof Buffer) {
        this.contents = filenameOrBuffer;
      } else {
        this.contents = fs.readFileSync(filenameOrBuffer);
        if (!this.contents) return;
      }
      this.data = new Data(this.contents);
      this.filter = null;
      data = this.data;
      firstByte = data.byteAt(0);
      if (firstByte === 0xFF && data.byteAt(1) === 0xD8) {
        return new JPEG(data);
      } else if (firstByte === 0x89 && data.stringAt(1, 3) === "PNG") {
        return new PNG(data);
      } else {
        throw new Error('Unknown image format.');
      }
    };

    return PDFImage;

  })();

  module.exports = PDFImage;

}).call(this);

}).call(this,_dereq_("buffer").Buffer)
},{"./data":8,"./image/jpeg":30,"./image/png":31,"buffer":1,"fs":"x/K9gc"}],30:[function(_dereq_,module,exports){
(function (process){
(function() {
  var Data, JPEG, fs, setImmediate;
  var __hasProp = Object.prototype.hasOwnProperty, __indexOf = Array.prototype.indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (__hasProp.call(this, i) && this[i] === item) return i; } return -1; };

  fs = _dereq_('fs');

  Data = '../data';

  setImmediate = setImmediate != null ? setImmediate : process.nextTick;

  JPEG = (function() {

    function JPEG(data) {
      var channels, len, marker, markers;
      this.data = data;
      len = data.length;
      if (data.readUInt16() !== 0xFFD8) throw "SOI not found in JPEG";
      markers = [0xFFC0, 0xFFC1, 0xFFC2, 0xFFC3, 0xFFC5, 0xFFC6, 0xFFC7, 0xFFC8, 0xFFC9, 0xFFCA, 0xFFCB, 0xFFCC, 0xFFCD, 0xFFCE, 0xFFCF];
      while (data.pos < len) {
        marker = data.readUInt16();
        if (__indexOf.call(markers, marker) >= 0) break;
        data.pos += data.readUInt16();
      }
      if (__indexOf.call(markers, marker) < 0) throw "Invalid JPEG.";
      data.pos += 2;
      this.bits = data.readByte();
      this.height = data.readShort();
      this.width = data.readShort();
      channels = data.readByte();
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
      this.imgData = this.data;
    }

    JPEG.prototype.object = function(document, fn) {
      var obj;
      obj = document.ref({
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
        obj.data['Decode'] = [1.0, 0.0, 1.0, 0.0, 1.0, 0.0, 1.0, 0.0];
      }
      obj.add(this.data.data);
      return setImmediate(function() {
        return fn(obj);
      });
    };

    return JPEG;

  })();

  module.exports = JPEG;

}).call(this);

}).call(this,_dereq_("/Users/bartoszpampuch/Sources/github/pdfmake/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js"))
},{"/Users/bartoszpampuch/Sources/github/pdfmake/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js":5,"fs":"x/K9gc"}],31:[function(_dereq_,module,exports){
(function (process,Buffer){
(function() {
  var PNG, PNGImage, setImmediate, zlib;

  zlib = _dereq_('zlib');

  PNG = _dereq_('png-js');

  setImmediate = setImmediate != null ? setImmediate : process.nextTick;

  PNGImage = (function() {

    function PNGImage(data) {
      this.image = new PNG(data.data);
      this.width = this.image.width;
      this.height = this.image.height;
      this.imgData = this.image.imgData;
    }

    PNGImage.prototype.object = function(document, fn) {
      var mask, obj, palette, rgb, sMask, val, x, _i, _len;
      var _this = this;
      if (!this.alphaChannel) {
        if (this.image.transparency.indexed) {
          this.loadIndexedAlphaChannel(function() {
            return _this.object(document, fn);
          });
          return;
        } else if (this.image.hasAlphaChannel) {
          this.splitAlphaChannel(function() {
            return _this.object(document, fn);
          });
          return;
        }
      }
      obj = document.ref({
        Type: 'XObject',
        Subtype: 'Image',
        BitsPerComponent: this.image.bits,
        Width: this.width,
        Height: this.height,
        Length: this.imgData.length,
        Filter: 'FlateDecode'
      });
      if (!this.image.hasAlphaChannel) {
        obj.data['DecodeParms'] = document.ref({
          Predictor: 15,
          Colors: this.image.colors,
          BitsPerComponent: this.image.bits,
          Columns: this.width
        });
      }
      if (this.image.palette.length === 0) {
        obj.data['ColorSpace'] = this.image.colorSpace;
      } else {
        palette = document.ref({
          Length: this.image.palette.length
        });
        palette.add(new Buffer(this.image.palette));
        obj.data['ColorSpace'] = ['Indexed', 'DeviceRGB', (this.image.palette.length / 3) - 1, palette];
      }
      if (this.image.transparency.grayscale) {
        val = this.image.transparency.greyscale;
        obj.data['Mask'] = [val, val];
      } else if (this.image.transparency.rgb) {
        rgb = this.image.transparency.rgb;
        mask = [];
        for (_i = 0, _len = rgb.length; _i < _len; _i++) {
          x = rgb[_i];
          mask.push(x, x);
        }
        obj.data['Mask'] = mask;
      }
      if (this.alphaChannel) {
        sMask = document.ref({
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
        sMask.add(this.alphaChannel);
        obj.data['SMask'] = sMask;
      }
      obj.add(this.imgData);
      return setImmediate(function() {
        return fn(obj);
      });
    };

    PNGImage.prototype.splitAlphaChannel = function(fn) {
      var _this = this;
      return this.image.decodePixels(function(pixels) {
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
          if (err) throw err;
          if (++done === 2) return fn();
        });
        return zlib.deflate(alphaChannel, function(err, alphaChannel) {
          _this.alphaChannel = alphaChannel;
          if (err) throw err;
          if (++done === 2) return fn();
        });
      });
    };

    PNGImage.prototype.loadIndexedAlphaChannel = function(fn) {
      var transparency;
      var _this = this;
      transparency = this.image.transparency.indexed;
      return this.image.decodePixels(function(pixels) {
        var alphaChannel, i, j, _ref;
        alphaChannel = new Buffer(_this.width * _this.height);
        i = 0;
        for (j = 0, _ref = pixels.length; j < _ref; j += 1) {
          alphaChannel[i++] = transparency[pixels[j]];
        }
        return zlib.deflate(alphaChannel, function(err, alphaChannel) {
          _this.alphaChannel = alphaChannel;
          if (err) throw err;
          return fn();
        });
      });
    };

    return PNGImage;

  })();

  module.exports = PNGImage;

}).call(this);

}).call(this,_dereq_("/Users/bartoszpampuch/Sources/github/pdfmake/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js"),_dereq_("buffer").Buffer)
},{"/Users/bartoszpampuch/Sources/github/pdfmake/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js":5,"buffer":1,"png-js":44,"zlib":6}],32:[function(_dereq_,module,exports){
(function() {
  var EventEmitter, LineWrapper, WORD_RE;
  var __hasProp = Object.prototype.hasOwnProperty, __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

  WORD_RE = /([^ ,\/!.?:;\-\n]*[ ,\/!.?:;\-]*)|\n/g;

  EventEmitter = _dereq_('events').EventEmitter;

  LineWrapper = (function() {

    __extends(LineWrapper, EventEmitter);

    function LineWrapper(document) {
      var _this = this;
      this.document = document;
      this.on('firstLine', function(options) {
        var indent;
        indent = options.indent || 0;
        _this.document.x += indent;
        options.lineWidth -= indent;
        return _this.once('line', function() {
          _this.document.x -= indent;
          return options.lineWidth += indent;
        });
      });
      this.on('lastLine', function(options) {
        var align;
        align = options.align;
        if (align === 'justify') options.align = 'left';
        return _this.once('line', function() {
          _this.document.y += options.paragraphGap || 0;
          return options.align = align;
        });
      });
    }

    LineWrapper.prototype.wrap = function(paragraphs, options) {
      var buffer, charSpacing, i, indent, len, nextY, spaceLeft, text, w, wc, wi, width, word, wordSpacing, wordWidths, words, _len, _len2, _ref, _ref2;
      width = this.document.widthOfString.bind(this.document);
      indent = options.indent || 0;
      charSpacing = options.characterSpacing || 0;
      wordSpacing = options.wordSpacing === 0;
      this.columns = options.columns || 1;
      this.columnGap = (_ref = options.columnGap) != null ? _ref : 18;
      this.lineWidth = (options.width - (this.columnGap * (this.columns - 1))) / this.columns;
      this.startY = this.document.y;
      this.column = 1;
      this.maxY = this.startY + options.height;
      nextY = this.document.y + this.document.currentLineHeight(true);
      if (this.document.y > this.maxY || nextY > this.maxY) this.nextSection();
      wordWidths = {};
      this.emit('sectionStart', options, this);
      for (i = 0, _len = paragraphs.length; i < _len; i++) {
        text = paragraphs[i];
        this.emit('firstLine', options, this);
        words = text.match(WORD_RE) || [text];
        spaceLeft = this.lineWidth - indent;
        options.lineWidth = spaceLeft;
        len = words.length;
        buffer = '';
        wc = 0;
        for (wi = 0, _len2 = words.length; wi < _len2; wi++) {
          word = words[wi];
          w = (_ref2 = wordWidths[word]) != null ? _ref2 : wordWidths[word] = width(word, options) + charSpacing + wordSpacing;
          if (w > spaceLeft || word === '\n') {
            options.textWidth = width(buffer.trim(), options) + wordSpacing * (wc - 1);
            this.emit('line', buffer.trim(), options, this);
            if (this.document.y > this.maxY) this.nextSection();
            spaceLeft = this.lineWidth - w;
            buffer = word === '\n' ? '' : word;
            wc = 1;
          } else {
            spaceLeft -= w;
            buffer += word;
            wc++;
          }
        }
        this.lastLine = true;
        this.emit('lastLine', options, this);
        options.textWidth = width(buffer.trim(), options) + wordSpacing * (wc - 1);
        this.emit('line', buffer.trim(), options, this);
        nextY = this.document.y + this.document.currentLineHeight(true);
        if (i < paragraphs.length - 1 && nextY > this.maxY) this.nextSection();
      }
      return this.emit('sectionEnd', options, this);
    };

    LineWrapper.prototype.nextSection = function(options) {
      var x;
      this.emit('sectionEnd', options, this);
      if (++this.column > this.columns) {
        x = this.document.x;
        this.document.addPage();
        this.column = 1;
        this.startY = this.document.page.margins.top;
        this.maxY = this.document.page.maxY();
        this.document.x = x;
        this.emit('pageBreak', options, this);
      } else {
        this.document.x += this.lineWidth + this.columnGap;
        this.document.y = this.startY;
        this.emit('columnBreak', options, this);
      }
      return this.emit('sectionStart', options, this);
    };

    return LineWrapper;

  })();

  module.exports = LineWrapper;

}).call(this);

},{"events":4}],33:[function(_dereq_,module,exports){
(function() {
  var PDFObject;
  var __slice = Array.prototype.slice;

  PDFObject = _dereq_('../object');

  module.exports = {
    annotate: function(x, y, w, h, options) {
      var key, val, _ref;
      options.Type = 'Annot';
      options.Rect = this._convertRect(x, y, w, h);
      options.Border = [0, 0, 0];
      if (options.Subtype !== 'Link') {
        if ((_ref = options.C) == null) {
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
      this.page.annotations.push(this.ref(options));
      return this;
    },
    note: function(x, y, w, h, contents, options) {
      var _ref;
      if (options == null) options = {};
      options.Subtype = 'Text';
      options.Contents = PDFObject.s(contents);
      options.Name = 'Comment';
      if ((_ref = options.color) == null) options.color = [243, 223, 92];
      return this.annotate(x, y, w, h, options);
    },
    link: function(x, y, w, h, url, options) {
      if (options == null) options = {};
      options.Subtype = 'Link';
      options.A = this.ref({
        S: 'URI',
        URI: PDFObject.s(url)
      });
      return this.annotate(x, y, w, h, options);
    },
    _markup: function(x, y, w, h, options) {
      var x1, x2, y1, y2, _ref;
      if (options == null) options = {};
      _ref = this._convertRect(x, y, w, h), x1 = _ref[0], y1 = _ref[1], x2 = _ref[2], y2 = _ref[3];
      options.QuadPoints = [x1, y2, x2, y2, x1, y1, x2, y1];
      options.Contents = PDFObject.s('');
      return this.annotate(x, y, w, h, options);
    },
    highlight: function(x, y, w, h, options) {
      var _ref;
      if (options == null) options = {};
      options.Subtype = 'Highlight';
      if ((_ref = options.color) == null) options.color = [241, 238, 148];
      return this._markup(x, y, w, h, options);
    },
    underline: function(x, y, w, h, options) {
      if (options == null) options = {};
      options.Subtype = 'Underline';
      return this._markup(x, y, w, h, options);
    },
    strike: function(x, y, w, h, options) {
      if (options == null) options = {};
      options.Subtype = 'StrikeOut';
      return this._markup(x, y, w, h, options);
    },
    lineAnnotation: function(x1, y1, x2, y2, options) {
      if (options == null) options = {};
      options.Subtype = 'Line';
      options.Contents = PDFObject.s('');
      options.L = [x1, this.page.height - y1, x2, this.page.height - y2];
      return this.annotate(x1, y1, x2, y2, options);
    },
    rectAnnotation: function(x, y, w, h, options) {
      if (options == null) options = {};
      options.Subtype = 'Square';
      options.Contents = PDFObject.s('');
      return this.annotate(x, y, w, h, options);
    },
    ellipseAnnotation: function(x, y, w, h, options) {
      if (options == null) options = {};
      options.Subtype = 'Circle';
      options.Contents = PDFObject.s('');
      return this.annotate(x, y, w, h, options);
    },
    textAnnotation: function(x, y, w, h, text, options) {
      if (options == null) options = {};
      options.Subtype = 'FreeText';
      options.Contents = PDFObject.s(text);
      options.DA = PDFObject.s('');
      return this.annotate(x, y, w, h, options);
    },
    _convertRect: function() {
      var rect;
      rect = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      rect[1] = this.page.height - rect[1] - rect[3];
      rect[2] += rect[0];
      rect[3] += rect[1];
      return rect;
    }
  };

}).call(this);

},{"../object":39}],34:[function(_dereq_,module,exports){
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
      if (color instanceof PDFGradient) return color;
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
      if (!color) return false;
      if (this._sMasked) {
        gstate = this.ref({
          Type: 'ExtGState',
          SMask: 'None'
        });
        name = "Gs" + (++this._opacityCount);
        this.page.ext_gstates[name] = gstate;
        this.addContent("/" + name + " gs");
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
      set = this._setColor(color, false);
      if (set && (opacity != null)) this.fillOpacity(opacity);
      return this;
    },
    strokeColor: function(color, opacity) {
      var set;
      set = this._setColor(color, true);
      if (set && (opacity != null)) this.strokeOpacity(opacity);
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
      var dictionary, id, key, name, _ref2;
      if (!(fillOpacity || strokeOpacity)) return;
      fillOpacity = Math.max(0, Math.min(1, fillOpacity));
      strokeOpacity = Math.max(0, Math.min(1, strokeOpacity));
      key = "" + fillOpacity + "_" + strokeOpacity;
      if (this._opacityRegistry[key]) {
        _ref2 = this._opacityRegistry[key], dictionary = _ref2[0], name = _ref2[1];
      } else {
        dictionary = {
          Type: 'ExtGState'
        };
        if (fillOpacity) dictionary.ca = fillOpacity;
        if (strokeOpacity) dictionary.CA = strokeOpacity;
        dictionary = this.ref(dictionary);
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

},{"../gradient":28}],35:[function(_dereq_,module,exports){
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
      if (size != null) this.fontSize(size);
      if (family == null) family = filename;
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
      if (includeGap == null) includeGap = false;
      return this._font.lineHeight(this._fontSize, includeGap);
    },
    registerFont: function(name, path, family) {
      this._registeredFonts[name] = {
        filename: path,
        family: family
      };
      return this;
    },
    embedFonts: function(fn) {
      var family, font, fonts, proceed;
      var _this = this;
      fonts = (function() {
        var _ref, _results;
        _ref = this._fontFamilies;
        _results = [];
        for (family in _ref) {
          font = _ref[family];
          _results.push(font);
        }
        return _results;
      }).call(this);
      return (proceed = function() {
        if (fonts.length === 0) return fn();
        return fonts.shift().embed(proceed);
      })();
    }
  };

}).call(this);

},{"../font":10}],36:[function(_dereq_,module,exports){
(function() {
  var PDFImage;
  var __hasProp = Object.prototype.hasOwnProperty, __indexOf = Array.prototype.indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (__hasProp.call(this, i) && this[i] === item) return i; } return -1; };

  PDFImage = _dereq_('../image');

  module.exports = {
    initImages: function() {
      this._imageRegistry = {};
      return this._imageCount = 0;
    },
    image: function(src, x, y, options) {
      var bh, bp, bw, h, hp, image, ip, label, pages, w, wp, _ref, _ref2, _ref3, _ref4, _ref5;
      if (options == null) options = {};
      if (typeof x === 'object') {
        options = x;
        x = null;
      }
      x = (_ref = x != null ? x : options.x) != null ? _ref : this.x;
      y = (_ref2 = y != null ? y : options.y) != null ? _ref2 : this.y;
      if (this._imageRegistry[src]) {
        _ref3 = this._imageRegistry[src], image = _ref3[0], label = _ref3[1], pages = _ref3[2];
        if (_ref4 = this.page, __indexOf.call(pages, _ref4) < 0) {
          pages.push(this.page);
        }
      } else {
        image = PDFImage.open(src);
        label = "I" + (++this._imageCount);
        this._imageRegistry[src] = [image, label, [this.page]];
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
        _ref5 = options.fit, bw = _ref5[0], bh = _ref5[1];
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
      if (this.y === y) this.y += h;
      this.save();
      this.transform(w, 0, 0, -h, x, y + h);
      this.addContent("/" + label + " Do");
      this.restore();
      return this;
    },
    embedImages: function(fn) {
      var images, item, proceed, src;
      var _this = this;
      images = (function() {
        var _ref, _results;
        _ref = this._imageRegistry;
        _results = [];
        for (src in _ref) {
          item = _ref[src];
          _results.push(item);
        }
        return _results;
      }).call(this);
      return (proceed = function() {
        var image, label, pages, _ref;
        if (images.length) {
          _ref = images.shift(), image = _ref[0], label = _ref[1], pages = _ref[2];
          return image.object(_this, function(obj) {
            var page, _base, _i, _len, _ref2;
            for (_i = 0, _len = pages.length; _i < _len; _i++) {
              page = pages[_i];
              if ((_ref2 = (_base = page.xobjects)[label]) == null) {
                _base[label] = obj;
              }
            }
            return proceed();
          });
        } else {
          return fn();
        }
      })();
    }
  };

}).call(this);

},{"../image":29}],37:[function(_dereq_,module,exports){
(function() {
  var LineWrapper, WORD_RE;

  WORD_RE = /([^ ,\/!.?:;\-\n]*[ ,\/!.?:;\-]*)|\n/g;

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
      if (lines == null) lines = 1;
      this.y += this.currentLineHeight(true) * lines + this._lineGap;
      return this;
    },
    moveUp: function(lines) {
      if (lines == null) lines = 1;
      this.y -= this.currentLineHeight(true) * lines + this._lineGap;
      return this;
    },
    text: function(text, x, y, options) {
      var line, paragraphs, wrapper, _i, _len;
      options = this._initOptions(x, y, options);
      text = '' + text;
      if (options.wordSpacing) text = text.replace(/\s{2,}/g, ' ');
      paragraphs = text.split('\n');
      if (options.width) {
        wrapper = new LineWrapper(this);
        wrapper.on('line', this._line.bind(this));
        wrapper.wrap(paragraphs, options);
      } else {
        for (_i = 0, _len = paragraphs.length; _i < _len; _i++) {
          line = paragraphs[_i];
          this._line(line, options);
        }
      }
      return this;
    },
    list: function(list, x, y, options, wrapper) {
      var flatten, i, indent, itemIndent, items, level, levels, r;
      var _this = this;
      options = this._initOptions(x, y, options);
      r = Math.round((this._font.ascender / 1000 * this._fontSize) / 3);
      indent = options.textIndent || r * 5;
      itemIndent = options.bulletIndent || r * 8;
      level = 1;
      items = [];
      levels = [];
      flatten = function(list) {
        var i, item, _len, _results;
        _results = [];
        for (i = 0, _len = list.length; i < _len; i++) {
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
      wrapper = new LineWrapper(this);
      wrapper.on('line', this._line.bind(this));
      level = 1;
      i = 0;
      wrapper.on('firstLine', function() {
        var diff, l;
        if ((l = levels[i++]) !== level) {
          diff = itemIndent * (l - level);
          _this.x += diff;
          wrapper.lineWidth -= diff;
          level = l;
        }
        _this.circle(_this.x - indent + r, _this.y + r + (r / 2), r);
        return _this.fill();
      });
      wrapper.on('sectionStart', function() {
        var pos;
        pos = indent + itemIndent * (level - 1);
        _this.x += pos;
        return wrapper.lineWidth -= pos;
      });
      wrapper.on('sectionEnd', function() {
        var pos;
        pos = indent + itemIndent * (level - 1);
        _this.x -= pos;
        return wrapper.lineWidth += pos;
      });
      wrapper.wrap(items, options);
      this.x -= indent;
      return this;
    },
    _initOptions: function(x, y, options) {
      var margins, _ref, _ref2, _ref3;
      if (x == null) x = {};
      if (options == null) options = {};
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
      if (x != null) this.x = x;
      if (y != null) this.y = y;
      if (options.lineBreak !== false) {
        margins = this.page.margins;
        if ((_ref = options.width) == null) {
          options.width = this.page.width - this.x - margins.right;
        }
        if ((_ref2 = options.height) == null) {
          options.height = this.page.height - this.y - margins.bottom;
        }
      }
      options.columns || (options.columns = 0);
      if ((_ref3 = options.columnGap) == null) options.columnGap = 18;
      return options;
    },
    widthOfString: function(string, options) {
      if (options == null) options = {};
      return this._font.widthOfString(string, this._fontSize) + (options.characterSpacing || 0) * (string.length - 1);
    },
    _line: function(text, options, wrapper) {
      var lineGap;
      if (options == null) options = {};
      this._fragment(text, this.x, this.y, options);
      lineGap = options.lineGap || this._lineGap || 0;
      if (!wrapper || (wrapper.lastLine && options.lineBreak === false)) {
        return this.x += this.widthOfString(text);
      } else {
        return this.y += this.currentLineHeight(true) + lineGap;
      }
    },
    _fragment: function(text, x, y, options) {
      var align, characterSpacing, i, mode, spaceWidth, state, textWidth, wordSpacing, words, _base, _name, _ref;
      text = '' + text;
      if (text.length === 0) return;
      state = this._textState;
      align = options.align || 'left';
      wordSpacing = options.wordSpacing || 0;
      characterSpacing = options.characterSpacing || 0;
      if (options.width) {
        switch (align) {
          case 'right':
            x += options.lineWidth - options.textWidth;
            break;
          case 'center':
            x += options.lineWidth / 2 - options.textWidth / 2;
            break;
          case 'justify':
            words = text.match(WORD_RE) || [text];
            if (!words) break;
            textWidth = this.widthOfString(text.replace(/\s+/g, ''), options);
            spaceWidth = this.widthOfString(' ') + characterSpacing;
            wordSpacing = (options.lineWidth - textWidth) / (words.length - 1) - spaceWidth;
        }
      }
      this.save();
      this.transform(1, 0, 0, -1, 0, this.page.height);
      y = this.page.height - y - (this._font.ascender / 1000 * this._fontSize);
      if ((_ref = (_base = this.page.fonts)[_name = this._font.id]) == null) {
        _base[_name] = this._font.ref;
      }
      this._font.use(text);
      text = this._font.encode(text);
      text = ((function() {
        var _ref2, _results;
        _results = [];
        for (i = 0, _ref2 = text.length; 0 <= _ref2 ? i < _ref2 : i > _ref2; 0 <= _ref2 ? i++ : i--) {
          _results.push(text.charCodeAt(i).toString(16));
        }
        return _results;
      })()).join('');
      this.addContent("BT");
      this.addContent("" + x + " " + y + " Td");
      this.addContent("/" + this._font.id + " " + this._fontSize + " Tf");
      mode = options.fill && options.stroke ? 2 : options.stroke ? 1 : 0;
      if (mode !== state.mode) this.addContent("" + mode + " Tr");
      if (wordSpacing !== state.wordSpacing) this.addContent(wordSpacing + ' Tw');
      if (characterSpacing !== state.characterSpacing) {
        this.addContent(characterSpacing + ' Tc');
      }
      this.addContent("<" + text + "> Tj");
      this.addContent("ET");
      this.restore();
      state.mode = mode;
      return state.wordSpacing = wordSpacing;
    }
  };

}).call(this);

},{"../line_wrapper":32}],38:[function(_dereq_,module,exports){
(function() {
  var KAPPA, SVGPath;
  var __slice = Array.prototype.slice;

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
      if (typeof c === 'string') c = this._CAP_STYLES[c.toUpperCase()];
      return this.addContent("" + c + " J");
    },
    _JOIN_STYLES: {
      MITER: 0,
      ROUND: 1,
      BEVEL: 2
    },
    lineJoin: function(j) {
      if (typeof j === 'string') j = this._JOIN_STYLES[j.toUpperCase()];
      return this.addContent("" + j + " j");
    },
    miterLimit: function(m) {
      return this.addContent("" + m + " M");
    },
    dash: function(length, options) {
      var phase, space, _ref;
      if (options == null) options = {};
      if (length == null) return this;
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
      if (r == null) r = 0;
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
      var l1, l2;
      if (r2 == null) r2 = r1;
      l1 = r1 * KAPPA;
      l2 = r2 * KAPPA;
      this.moveTo(x + r1, y);
      this.bezierCurveTo(x + r1, y + l1, x + l2, y + r2, x, y + r2);
      this.bezierCurveTo(x - l2, y + r2, x - r1, y + l1, x - r1, y);
      this.bezierCurveTo(x - r1, y - l1, x - l2, y - r2, x, y - r2);
      this.bezierCurveTo(x + l2, y - r2, x + r1, y - l1, x + r1, y);
      return this.moveTo(x, y);
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
      if (/even-?odd/.test(rule)) return '*';
      return '';
    },
    fill: function(color, rule) {
      if (/(even-?odd)|(non-?zero)/.test(color)) {
        rule = color;
        color = null;
      }
      if (color) this.fillColor(color);
      return this.addContent('f' + this._windingRule(rule));
    },
    stroke: function(color) {
      if (color) this.strokeColor(color);
      return this.addContent('S');
    },
    fillAndStroke: function(fillColor, strokeColor, rule) {
      var isFillRule;
      if (strokeColor == null) strokeColor = fillColor;
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
      if (options == null) options = {};
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
      if (yFactor == null) yFactor = xFactor;
      if (options == null) options = {};
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

},{"../path":41}],39:[function(_dereq_,module,exports){
(function (Buffer){
(function() {

  /*
  PDFObject - converts JavaScript types into their corrisponding PDF types.
  By Devon Govett
  */

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
      var a, i, l, _ref;
      l = buff.length;
      if (l & 0x01) {
        throw new Error("Buffer length must be even");
      } else {
        for (i = 0, _ref = l - 1; i < _ref; i += 2) {
          a = buff[i];
          buff[i] = buff[i + 1];
          buff[i + 1] = a;
        }
      }
      return buff;
    };

    PDFObject.s = function(string, swap) {
      if (swap == null) swap = false;
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
},{"./reference":42,"buffer":1}],40:[function(_dereq_,module,exports){
(function() {

  /*
  PDFPage - represents a single page in the PDF document
  By Devon Govett
  */

  var PDFPage;

  PDFPage = (function() {
    var DEFAULT_MARGINS, SIZES;

    function PDFPage(document, options) {
      var dimensions;
      var _this = this;
      this.document = document;
      if (options == null) options = {};
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
      this.dictionary = this.document.ref({
        Type: 'Page',
        Parent: this.document.store.pages,
        MediaBox: [0, 0, this.width, this.height],
        Contents: this.content
      });
      this.dictionary.data['Resources'] = this.document.ref({
        ProcSet: ['PDF', 'Text', 'ImageB', 'ImageC', 'ImageI']
      });
      this.resources = this.dictionary.data['Resources'].data;
      Object.defineProperties(this, {
        fonts: {
          get: function() {
            var _base, _ref;
            return (_ref = (_base = _this.resources)['Font']) != null ? _ref : _base['Font'] = {};
          }
        },
        xobjects: {
          get: function() {
            var _base, _ref;
            return (_ref = (_base = _this.resources)['XObject']) != null ? _ref : _base['XObject'] = {};
          }
        },
        ext_gstates: {
          get: function() {
            var _base, _ref;
            return (_ref = (_base = _this.resources)['ExtGState']) != null ? _ref : _base['ExtGState'] = {};
          }
        },
        patterns: {
          get: function() {
            var _base, _ref;
            return (_ref = (_base = _this.resources)['Pattern']) != null ? _ref : _base['Pattern'] = {};
          }
        },
        annotations: {
          get: function() {
            var _base, _ref;
            return (_ref = (_base = _this.dictionary.data)['Annots']) != null ? _ref : _base['Annots'] = [];
          }
        }
      });
    }

    PDFPage.prototype.maxY = function() {
      return this.height - this.margins.bottom;
    };

    PDFPage.prototype.finalize = function(fn) {
      return this.content.finalize(this.document.compress, fn);
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

},{}],41:[function(_dereq_,module,exports){
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
            if (curArg.length > 0) args[args.length] = +curArg;
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
          if (curArg.length === 0) continue;
          if (args.length === params) {
            ret[ret.length] = {
              cmd: cmd,
              args: args
            };
            args = [+curArg];
            if (cmd === "M") cmd = "L";
            if (cmd === "m") cmd = "l";
          } else {
            args[args.length] = +curArg;
          }
          foundDecimal = c === ".";
          curArg = c === '-' || c === '.' ? c : '';
        } else {
          curArg += c;
          if (c === '.') foundDecimal = true;
        }
      }
      if (curArg.length > 0) args[args.length] = +curArg;
      ret[ret.length] = {
        cmd: cmd,
        args: args
      };
      return ret;
    };

    cx = cy = px = py = sx = sy = 0;

    apply = function(commands, doc) {
      var c, i, _len, _name;
      cx = cy = px = py = sx = sy = 0;
      for (i = 0, _len = commands.length; i < _len; i++) {
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
      var a00, a01, a10, a11, cos_th, d, i, pl, result, segments, sfactor, sfactor_sq, sin_th, th, th0, th1, th2, th3, th_arc, x0, x1, xc, y0, y1, yc;
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
      if (sfactor_sq < 0) sfactor_sq = 0;
      sfactor = Math.sqrt(sfactor_sq);
      if (sweep === large) sfactor = -sfactor;
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
      for (i = 0; 0 <= segments ? i < segments : i > segments; 0 <= segments ? i++ : i--) {
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

},{}],42:[function(_dereq_,module,exports){
(function (process,Buffer){
(function() {

  /*
  PDFReference - represents a reference to another object in the PDF object heirarchy
  By Devon Govett
  */

  var PDFObject, PDFReference, setImmediate, zlib;

  zlib = _dereq_('zlib');

  setImmediate = setImmediate != null ? setImmediate : process.nextTick;

  PDFReference = (function() {

    function PDFReference(id, data) {
      this.id = id;
      this.data = data != null ? data : {};
      this.gen = 0;
      this.stream = null;
      this.finalizedStream = null;
    }

    PDFReference.prototype.object = function(compress, fn) {
      var out;
      var _this = this;
      if (this.finalizedStream == null) {
        return this.finalize(compress, function() {
          return _this.object(compress, fn);
        });
      }
      out = ["" + this.id + " " + this.gen + " obj"];
      out.push(PDFObject.convert(this.data));
      if (this.stream) {
        out.push("stream");
        out.push(this.finalizedStream);
        out.push("endstream");
      }
      out.push("endobj");
      return fn(out.join('\n'));
    };

    PDFReference.prototype.add = function(s) {
      var _ref;
      if ((_ref = this.stream) == null) this.stream = [];
      return this.stream.push(Buffer.isBuffer(s) ? s.toString('binary') : s);
    };

    PDFReference.prototype.finalize = function(compress, fn) {
      var data, i;
      var _this = this;
      if (compress == null) compress = false;
      if (this.stream) {
        data = this.stream.join('\n');
        if (compress && !this.data.Filter) {
          data = new Buffer((function() {
            var _ref, _results;
            _results = [];
            for (i = 0, _ref = data.length; 0 <= _ref ? i < _ref : i > _ref; 0 <= _ref ? i++ : i--) {
              _results.push(data.charCodeAt(i));
            }
            return _results;
          })());
          return zlib.deflate(data, function(err, compressedData) {
            if (err) throw err;
            _this.finalizedStream = compressedData.toString('binary');
            _this.data.Filter = 'FlateDecode';
            _this.data.Length = _this.finalizedStream.length;
            return fn();
          });
        } else {
          this.finalizedStream = data;
          this.data.Length = this.finalizedStream.length;
          return setImmediate(fn);
        }
      } else {
        this.finalizedStream = '';
        return setImmediate(fn);
      }
    };

    PDFReference.prototype.toString = function() {
      return "" + this.id + " " + this.gen + " R";
    };

    return PDFReference;

  })();

  module.exports = PDFReference;

  PDFObject = _dereq_('./object');

}).call(this);

}).call(this,_dereq_("/Users/bartoszpampuch/Sources/github/pdfmake/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js"),_dereq_("buffer").Buffer)
},{"./object":39,"/Users/bartoszpampuch/Sources/github/pdfmake/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js":5,"buffer":1,"zlib":6}],43:[function(_dereq_,module,exports){
(function() {

  /*
  PDFObjectStore - stores the object heirarchy for the PDF document
  By Devon Govett
  */

  var PDFObjectStore, PDFReference;

  PDFReference = _dereq_('./reference');

  PDFObjectStore = (function() {

    function PDFObjectStore() {
      this.objects = {};
      this.length = 0;
      this.root = this.ref({
        Type: 'Catalog',
        Pages: this.ref({
          Type: 'Pages',
          Count: 0,
          Kids: []
        })
      });
      this.pages = this.root.data['Pages'];
    }

    PDFObjectStore.prototype.ref = function(data) {
      return this.push(++this.length, data);
    };

    PDFObjectStore.prototype.push = function(id, data) {
      var ref;
      ref = new PDFReference(id, data);
      this.objects[id] = ref;
      return ref;
    };

    PDFObjectStore.prototype.addPage = function(page) {
      this.pages.data['Kids'].push(page.dictionary);
      return this.pages.data['Count']++;
    };

    return PDFObjectStore;

  })();

  module.exports = PDFObjectStore;

}).call(this);

},{"./reference":42}],44:[function(_dereq_,module,exports){
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
},{"buffer":1,"fs":"x/K9gc","zlib":6}],"fs":[function(_dereq_,module,exports){
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

}).call(this,_dereq_("buffer").Buffer,"/browser-extensions")
},{"buffer":1}],47:[function(_dereq_,module,exports){
/* jslint node: true */
'use strict';

/**
* Calculates column widths
* @private
*/
module.exports = {
	buildColumnWidths: function(columns, availableWidth) {
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

		function isAutoColumn(column) {
			return column.width === 'auto';
		}

		function isStarColumn(column) {
			return column.width === null || column.width === undefined || column.width === '*' || column.width === 'star';
		}
	}
};

},{}],48:[function(_dereq_,module,exports){
/* jslint node: true */
'use strict';

var TextTools = _dereq_('./textTools');
var StyleContextStack = _dereq_('./styleContextStack');
var fontStringify = _dereq_('./helpers').fontStringify;

/**
* @private
*/
function DocMeasure(fontProvider, styleDictionary, defaultStyle) {
	this.textTools = new TextTools(fontProvider);
	this.styleStack = new StyleContextStack(styleDictionary, defaultStyle);
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
		} else if (node.text) {
			return extendMargins(self.measureLeaf(node));
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

DocMeasure.prototype.measureColumns = function(node) {
	var columns = node.columns;
	node._minWidth = 0;
	node._maxWidth = 0;
	node._gap = this.styleStack.getProperty('columnGap');

	for(var i = 0, l = columns.length; i < l; i++) {
		columns[i] = this.measureNode(columns[i]);

		node._minWidth += columns[i]._minWidth;
		node._maxWidth += columns[i]._maxWidth;
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

DocMeasure.prototype.measureTable = function(node) {
	extendTableWidths(node);

	node.table._minWidth = 0;
	node.table._maxWidth = 0;

	for(var col = 0, cols = node.table.body[0].length; col < cols; col++) {
		node.table.widths[col]._minWidth = 0;
		node.table.widths[col]._maxWidth = 0;

		for(var row = 0, rows = node.table.body.length; row < rows; row++) {
			node.table.body[row][col] = this.measureNode(node.table.body[row][col]);

			node.table.widths[col]._minWidth = Math.max(node.table.widths[col]._minWidth, node.table.body[row][col]._minWidth);
			node.table.widths[col]._maxWidth = Math.max(node.table.widths[col]._maxWidth, node.table.body[row][col]._maxWidth);
		}

		node.table._minWidth += node.table.widths[col]._minWidth;
		node.table._maxWidth += node.table.widths[col]._maxWidth;
	}

	return node;

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

},{"./helpers":51,"./styleContextStack":56,"./textTools":57}],49:[function(_dereq_,module,exports){
/* jslint node: true */
'use strict';

/**
* Creates an instance of DocumentContext - a store for current x, y positions and available width/height.
* It facilitates column divisions and vertical sync
*/
function DocumentContext(pageSize, pageMargins, addFirstPageAutomatically) {
	this.pages = [];

	this.pageSize = pageSize;
	this.pageMargins = pageMargins;

	this.x = pageMargins.left;
	this.availableWidth = pageSize.width - pageMargins.left - pageMargins.right;
	this.availableHeight = 0;
	this.page = -1;

	this.snapshots = [];

	if (addFirstPageAutomatically) this.addPage();
}

DocumentContext.prototype.beginColumnGroup = function() {
	this.snapshots.push({
		x: this.x,
		y: this.y,
		availableHeight: this.availableHeight,
		availableWidth: this.availableWidth,
		page: this.page,
		bottomMost: { y: this.y, page: this.page }
	});

	this.lastColumnWidth = 0;
};

DocumentContext.prototype.beginColumn = function(width, offset) {
	var saved = this.snapshots[this.snapshots.length - 1];
	saved.bottomMost = bottomMostContext(this, saved.bottomMost);

	this.page = saved.page;
	this.x = this.x + this.lastColumnWidth + (offset || 0);
	this.y = saved.y;
	this.availableWidth = width;	//saved.availableWidth - offset;
	this.availableHeight = saved.availableHeight;

	this.lastColumnWidth = width;
};

DocumentContext.prototype.completeColumnGroup = function() {
	var saved = this.snapshots.pop();
	var bottomMost = bottomMostContext(this, saved.bottomMost);

	this.x = saved.x;
	this.y = bottomMost.y;
	this.page = bottomMost.page;
	this.availableWidth = saved.availableWidth;
	this.availableHeight = bottomMost.availableHeight;
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
	var page = { lines: [], vectors: [] };
	this.pages.push(page);
	this.page = this.pages.length - 1;
	this.moveToPageTop();

	return page;
};

DocumentContext.prototype.getCurrentPage = function() {
	if (this.page < 0 || this.page >= this.pages.length) return null;

	return this.pages[this.page];
};

DocumentContext.prototype.createUnbreakableSubcontext = function() {
	var height = this.pageSize.height - this.pageMargins.top - this.pageMargins.bottom;
	var width = this.availableWidth;

	var ctx = new DocumentContext({ width: width, height: height }, { left: 0, right: 0, top: 0, bottom: 0 });
	ctx.addPage();

	return ctx;
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

/****TESTS**** (remove first '/' to comment)
DocumentContext.bottomMostContext = bottomMostContext;
// */

module.exports = DocumentContext;

},{}],50:[function(_dereq_,module,exports){
/* jslint node: true */
'use strict';

var Line = _dereq_('./line');
var pack = _dereq_('./helpers').pack;
var offsetVector = _dereq_('./helpers').offsetVector;

/**
* Creates an instance of ElementWriter - a line/vector writer, which adds
* elements to current page and sets their positions based on the context
*/
function ElementWriter(context, tracker) {
	this.setContext(context);
	this.tracker = tracker || { emit: function() { } };
}

ElementWriter.prototype.setContext = function(context) {
	this.context = context;
};

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

ElementWriter.prototype.addVector = function(vector) {
	var context = this.context;
	var page = context.getCurrentPage();

	if (page) {
		offsetVector(vector, context.x, context.y);
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

ElementWriter.prototype.addFragment = function(block, isRepeatable) {
	var ctx = this.context;
	var page = ctx.getCurrentPage();

	if (block.height > ctx.availableHeight) return false;

	block.lines.forEach(function(line) {
		var l = cloneLine(line);

		l.x = (l.x || 0) + (isRepeatable ? block.xOffset : ctx.x);
		l.y = (l.y || 0) + ctx.y;

		page.lines.push(l);
	});

	block.vectors.forEach(function(vector) {
		var v = pack(vector);

		offsetVector(v, isRepeatable ? block.xOffset : ctx.x, ctx.y);
		page.vectors.push(v);
	});

	ctx.moveDown(block.height);

	return true;
};


module.exports = ElementWriter;

},{"./helpers":51,"./line":53}],51:[function(_dereq_,module,exports){
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

module.exports = {
	pack: pack,
	fontStringify: fontStringify,
	offsetVector: offsetVector
};

},{}],52:[function(_dereq_,module,exports){
/* jslint node: true */
'use strict';

var TraversalTracker = _dereq_('./traversalTracker');
var DocMeasure = _dereq_('./docMeasure');
var DocumentContext = _dereq_('./documentContext');
var PageElementWriter = _dereq_('./pageElementWriter');
var ColumnCalculator = _dereq_('./columnCalculator');
var Line = _dereq_('./line');
var pack = _dereq_('./helpers').pack;
var offsetVector = _dereq_('./helpers').offsetVector;
var fontStringify = _dereq_('./helpers').fontStringify;

/**
 * Creates an instance of LayoutBuilder - layout engine which turns document-definition-object
 * into a set of pages, lines, inlines and vectors ready to be rendered into a PDF
 *
 * @param {Object} pageSize - an object defining page width and height
 * @param {Object} pageMargins - an object defining top, left, right and bottom margins
 */
function LayoutBuilder(pageSize, pageMargins) {
	this.pageSize = pageSize;
	this.pageMargins = pageMargins;
	this.tracker = new TraversalTracker();
}

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
LayoutBuilder.prototype.layoutDocument = function (docStructure, fontProvider, styleDictionary, defaultStyle) {
	new DocMeasure(fontProvider, styleDictionary, defaultStyle).measureDocument(docStructure);

	this.writer = new PageElementWriter(
		new DocumentContext(this.pageSize, this.pageMargins, true),
		this.tracker);

	this.processNode({ stack: docStructure });

	return this.writer.context.pages;
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
		} else if (node.text) {
			self.processLeaf(node);
		} else if (node.canvas) {
			self.processCanvas(node);
		} else {
			throw 'Unrecognized document structure: ' + JSON.stringify(node, fontStringify);
		}
	});

	function applyMargins(callback) {
		var margin = node._margin;

		if (margin) {
			self.writer.context.moveDown(margin[1]);
			self.writer.context.addMargin(margin[0], margin[2]);
		}

		callback();

		if(margin) {
			self.writer.context.addMargin(-margin[0], -margin[2]);
			self.writer.context.moveDown(margin[3]);
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
	var availableWidth = this.writer.context.availableWidth;
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

LayoutBuilder.prototype.processRow = function(columns, widths, gaps) {
	widths = widths || columns;

	this.writer.context.beginColumnGroup();

	for(var i = 0, l = columns.length; i < l; i++) {
		var column = columns[i];
		this.writer.context.beginColumn(widths[i]._calcWidth, colLeftOffset(i));
		this.processNode(column);
	}

	this.writer.context.completeColumnGroup();

	function colLeftOffset(i) {
		if (gaps && gaps.length > i) return gaps[i];
		return 0;
	}
};

// lists
LayoutBuilder.prototype.processList = function(orderedList, items, gapSize) {
	var self = this;

	this.writer.context.addMargin(gapSize.width);

	var nextMarker;
	this.tracker.auto('lineAdded', addMarkerToFirstLeaf, function() {
		items.forEach(function(item) {
			nextMarker = item.listMarker;
			self.processNode(item);
		});
	});

	this.writer.context.addMargin(-gapSize.width);

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
	var self = this;
	var layout = getLayout();
	var offsets = getOffsets(layout);

	ColumnCalculator.buildColumnWidths(tableNode.table.widths, this.writer.context.availableWidth - offsets.total);

	var totalTableWidth = offsets.total + getTableWidth();

	var headerRows = tableNode.table.headerRows;
	var keepWithHeaderRows = (tableNode.table.keepWithHeaderRows === undefined) ? 0 : tableNode.table.keepWithHeaderRows;
	var waitingForCommit = false;
	var headerBlock;

	if(headerRows) {
		this.writer.beginUnbreakableBlock();
		waitingForCommit = true;
	}

	drawHorizontalLine(layout, 0);

	for(var i = 0, l = tableNode.table.body.length; i < l; i++) {
		this.writer.context.moveDown(layout.paddingTop(i, tableNode));
		this.processRow(tableNode.table.body[i], tableNode.table.widths, offsets.offsets);
		this.writer.context.moveDown(layout.paddingBottom(i, tableNode));
		drawHorizontalLine(layout, i + 1);

		if (headerRows && i === headerRows - 1) {
			// header has been created
			headerBlock = this.writer.unbreakableBlockToRepeatable();
		}

		if (waitingForCommit && ((i === headerRows + keepWithHeaderRows - 1) || (i === l - 1))) {
			this.writer.commitUnbreakableBlock();
			if (headerBlock) this.writer.pushToRepeatables(headerBlock);
			waitingForCommit = false;
		}
	}

	this.writer.popFromRepeatables();

	function drawHorizontalLine(layout, i) {
		var width = layout.hLineWidth(i, tableNode, tableNode);
		if (width) {
			var offset = width / 2;

			self.writer.addVector({ type:'line', x1: 0, x2: totalTableWidth, y1: offset, y2: offset, lineWidth: width, lineColor: layout.hLineColor(i, tableNode) });
			self.writer.context.moveDown(width);
		}
	}

	function getLayout() {
		var defaultLayout = {
			hLineWidth: function(i, node) { return node.table.headerRows && i === node.table.headerRows && 3 || 0; },
			vLineWidth: function(i, node) { return 1; },
			hLineColor: function(i, node) { return 'black'; },
			vLineColor: function(i, node) { return 'black'; },
			paddingLeft: function(i, node) { return i && 4 || 0; },
			paddingRight: function(i, node) { return (i < node.table.widths.length - 1) ? 4 : 0; },
			paddingTop: function(i, node) { return 2; },
			paddingBottom: function(i, node) { return 2; }
		};

		return pack(defaultLayout, tableNode.layout);
	}

	function getOffsets(layout) {
		var offsets = [];
		var totalOffset = 0;
		var prevRightPadding = 0;

		for(var i = 0, l = tableNode.table.widths.length; i < l; i++) {
			var lOffset = prevRightPadding + layout.vLineWidth(i, tableNode) + layout.paddingLeft(i, tableNode);
			offsets.push(lOffset);
			totalOffset += lOffset;
			prevRightPadding = layout.paddingRight(i, tableNode);
		}

		totalOffset += prevRightPadding + layout.vLineWidth(tableNode.table.widths.length, tableNode);

		return {
			total: totalOffset,
			offsets: offsets
		};
	}

	function getTableWidth() {
		var width = 0;

		tableNode.table.widths.forEach(function(w) {
			width += w._calcWidth;
		});

		return width;
	}
};


LayoutBuilder.prototype.addHorizontalLine = function(x1, x2, lh) {
	var context = this.getContext();
	context.y += lh/2;
	context.availableHeight -= lh/2;

	var line = {
		type: 'line',
		x1: context.x + x1,
		y1: context.y,
		x2: context.x + x2,
		y2: context.y,
		lineWidth: lh
	};

	context.y += lh/2;
	context.availableHeight -= lh/2;

	this.getPage(context.page).vectors.push(line);
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

	var line = new Line(this.writer.context.availableWidth);

	while(textNode._inlines && textNode._inlines.length > 0 && line.hasEnoughSpaceForInline(textNode._inlines[0])) {
		line.addInline(textNode._inlines.shift());
	}

	line.lastLineInParagraph = textNode._inlines.length === 0;
	return line;
};

LayoutBuilder.prototype.processCanvas = function(node) {
	var height = node._minHeight;

	if (this.writer.context.availableHeight < height) {
		// TODO: support for canvas larger than a page
		// TODO: support for other overflow methods

		this.writer.moveToNextPage();
	}

	node.canvas.forEach(function(vector) {
		this.writer.addVector(vector);
	}, this);

	this.writer.context.moveDown(height);
};


module.exports = LayoutBuilder;

},{"./columnCalculator":47,"./docMeasure":48,"./documentContext":49,"./helpers":51,"./line":53,"./pageElementWriter":54,"./traversalTracker":58}],53:[function(_dereq_,module,exports){
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

},{}],54:[function(_dereq_,module,exports){
/* jslint node: true */
'use strict';

var ElementWriter = _dereq_('./elementWriter');

/**
* Creates an instance of PageElementWriter - line/vector writer
* used by LayoutBuilder.
*
* It creates new pages when required, supports repeatable fragments
* (ie. table headers), headers and footers.
*/
function PageElementWriter(context, tracker) {
	this.originalContext = this.context = context;
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

PageElementWriter.prototype.addVector = function(vector) {
	this.writer.addVector(vector);
};

PageElementWriter.prototype.addFragment = function(fragment) {
	if (!this.writer.addFragment(fragment)) {
		this.moveToNextPage();
		this.writer.addFragment(fragment);
	}
};

PageElementWriter.prototype.moveToNextPage = function() {
	var nextPageIndex = this.context.page + 1;

	if (nextPageIndex >= this.context.pages.length) {
		// create new Page
		var page = { lines: [], vectors: [] };
		this.context.pages.push(page);
		this.context.page = nextPageIndex;
		this.context.moveToPageTop();

		// add repeatable fragments
		this.repeatables.forEach(function(rep) {
			this.writer.addFragment(rep, true);
		}, this);

		// add header/footer
	} else {
		this.context.page = nextPageIndex;
		this.context.moveToPageTop();

		this.repeatables.forEach(function(rep) {
			this.context.moveDown(rep.height);
		}, this);
	}
};

PageElementWriter.prototype.beginUnbreakableBlock = function() {
	if (this.transactionLevel++ === 0) {
		this.transactionContext = this.context.createUnbreakableSubcontext();
		this._activateTransactionContext();
	}
};

PageElementWriter.prototype.commitUnbreakableBlock = function() {
	if (--this.transactionLevel === 0) {
		this._removeTransactionContext();

		if(this.transactionContext.pages.length > 0) {
			// no support for multi-page unbreakableBlocks
			var fragment = this.transactionContext.pages[0];

			//TODO: vectors can influence height in some situations
			fragment.height = this.transactionContext.y;

			this.addFragment(fragment);
		}
	}
};

PageElementWriter.prototype.unbreakableBlockToRepeatable = function() {
	var rep = { lines: [], vectors: [] };

	this.transactionContext.pages[0].lines.forEach(function(line) {
		rep.lines.push(line);
	});

	this.transactionContext.pages[0].vectors.forEach(function(vector) {
		rep.vectors.push(vector);
	});

	rep.xOffset = this.originalContext.x;

	//TODO: vectors can influence height in some situations
	rep.height = this.transactionContext.y;

	return rep;
};

PageElementWriter.prototype.pushToRepeatables = function(rep) {
	this.repeatables.push(rep);
};

PageElementWriter.prototype.popFromRepeatables = function() {
	this.repeatables.pop();
};


PageElementWriter.prototype._activateTransactionContext = function() {
	this.context = this.transactionContext;
	this.writer.setContext(this.context);
};

PageElementWriter.prototype._removeTransactionContext = function() {
	this.context = this.originalContext;
	this.writer.setContext(this.context);
};

module.exports = PageElementWriter;

},{"./elementWriter":50}],55:[function(_dereq_,module,exports){
/* jslint node: true */
'use strict';

var LayoutBuilder = _dereq_('./layoutBuilder');
var PdfKit = _dereq_('pdfkit');

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
 * @param {Object} docDefinition.pageMargins.left
 * @param {Object} docDefinition.pageMargins.top
 * @param {Object} docDefinition.pageMargins.right
 * @param {Object} docDefinition.pageMargins.bottom
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
 * pdfDoc.write('sample.pdf');
 *
 * @return {Object} a pdfKit document object which can be saved or encode to data-url
 */
PdfPrinter.prototype.createPdfKitDocument = function(docDefinition) {
	var pageSize = docDefinition.pageSize || { width: 595.28, height: 841.89 };
	this.pdfKitDoc = new PdfKit({ size: [ pageSize.width, pageSize.height ]});
	this.pdfKitDoc.info.Producer = 'pdfmake';
	this.pdfKitDoc.info.Creator = 'pdfmake';
	this.fontProvider = new FontProvider(this.fontDescriptors, this.pdfKitDoc);

	var builder = new LayoutBuilder(
		pageSize,
		docDefinition.pageMargins || { left: 40, top: 40, bottom: 40, right: 40 });

	var pages = builder.layoutDocument(docDefinition.content, this.fontProvider, docDefinition.styles || {}, docDefinition.defaultStyle || { fontSize: 12, font: 'Roboto' });

	renderPages(pages, this.fontProvider, this.pdfKitDoc);
	return this.pdfKitDoc;
};

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

},{"./layoutBuilder":52,"fs":"x/K9gc","pdfkit":9}],56:[function(_dereq_,module,exports){
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

},{}],57:[function(_dereq_,module,exports){
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

/****TESTS**** (remove first '/' to comment)
TextTools.prototype.splitWords = splitWords;
TextTools.prototype.normalizeTextArray = normalizeTextArray;
TextTools.prototype.measure = measure;
// */


module.exports = TextTools;

},{}],58:[function(_dereq_,module,exports){
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

},{}]},{},[55])
(55)
});