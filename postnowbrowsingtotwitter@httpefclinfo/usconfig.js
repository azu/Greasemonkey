//============================================================================
// USConfig
// User Script's Config dialog library
//
// File    : usconfig.js
// Author  : h1mesuke <himesuke@gmail.com>
// Updated : 2010-12-08
// Version : 1.1.1
//
// == Description
//
// USConfig is a library that provides GUI dialogs to help the user
// configuring the script easily.
//
// == License
//
//    Licensed under the MIT license:
//
//    Permission is hereby granted, free of charge, to any person obtaining
//    a copy of this software and associated documentation files (the
//    "Software"), to deal in the Software without restriction, including
//    without limitation the rights to use, copy, modify, merge, publish,
//    distribute, sublicense, and/or sell copies of the Software, and to
//    permit persons to whom the Software is furnished to do so, subject to
//    the following conditions:
//    
//    The above copyright notice and this permission notice shall be included
//    in all copies or substantial portions of the Software.
//    
//    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
//    OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
//    MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
//    IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
//    CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
//    TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
//    SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//
//============================================================================

var Config = {
  // Dialog instances
  dialogs: {},

  // Defines a config dialog with the given name.
  //
  define: function(name, buildFunc, opts) {
    this.dialogs[name] = new Config.Dialog(name, buildFunc, opts);
    if (!this.__first_defined__) this.__first_defined__ = name;
  },

  // Opens a dialog with the given name.
  //
  open: function(name) { Config._open(name) },

  _open: function(name) {
    name = (name || this.__first_defined__);
    var dlg = this.dialogs[name];
    if (!dlg) throw "\nUSCONFIG: ERROR: DIALOG NOT DEFINED for \"" + name + "\"\n";
    dlg.build();
    dlg.show();
  },

  // Loads the settings associated with the dialog of the given name from the
  // local storage. If there's any new key whose value hasn't been saved, the
  // default value will be returned. Therefore, when the first time of
  // loading, this function will return the defautls.
  //
  load: function(name) {
    name = (name || this.__first_defined__);
    var dlg = this.dialogs[name];
    if (!dlg) throw "\nUSCONFIG: ERROR: DIALOG NOT DEFINED for \"" + name + "\"\n";

    var settings = {};
    dlg.dummyBuild();
    dlg.load();
    for (var key in dlg.defaults) settings[key] = dlg.defaults[key];
    for (var key in dlg.settings) settings[key] = dlg.settings[key];

    Config.debug && GM_log("\nUSCONFIG: DEBUG: SETTINGS LOADED for \"" + name + "\"\n" +
      settings.toSource());

    return settings;
  },

  // Saves the settings associated with the dialog of the given name to the
  // local storage.
  //
  save: function(settings, name) {
    name = (name || this.__first_defined__);
    var dlg = this.dialogs[name];
    if (!dlg) throw "\nUSCONFIG: ERROR: DIALOG NOT DEFINED for \"" + name + "\"\n";
    dlg.settings = settings;
    dlg.save();
  },

  center: function(frame) {
    frame = (frame || this._frame());
    if (!frame) return;
    var style = frame.style;
    style.top  = Math.floor((window.innerHeight - frame.offsetHeight) / 2) + 'px';
    style.left = Math.floor((window.innerWidth  - frame.offsetWidth ) / 2) + 'px';
  },

  remove: function(frame) {
    frame = (frame || this._frame(true));
    if (!frame) return;
    frame.style.display = 'none';
    frame.parentNode.removeChild(frame);
    Config.debug && GM_log("\nUSCONFIG: DEBUG: FRAME REMOVED");
    frame = null;
  },

  _frame: function(gmc) {
    var test = "@id='usconfig_frame'";
    if (gmc) test += " or @id='GM_config'";
    return document.evaluate("//iframe[" + test + "]",
      document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
  },

  debug: false,
};

// alias
Config.close = Config.remove;

//---------------------------------------------------------------------------
// I18n

Config.locale = {

  preferred: null,
  _language: (navigator.language || navigator.userLanguage).substring(0, 2),

  language: function() {
    return this.preferred || this._language;
  },

  translations: {

    en: {
      'Save'            : 'Save',
      'Cancel'          : 'Cancel',
      'Reset'           : 'Reset to defaults',
      'require_integer' : '"${label}" must be an integer.',
      'require_number'  : '"${label}" must be a number.',
    },

    ja: {
      'Save'            : "保存",
      'Cancel'          : "キャンセル",
      'Reset'           : "デフォルトに戻す",
      'require_integer' : "「${label}」には整数を設定して下さい。",
      'require_number'  : "「${label}」には数値を設定して下さい。",
    },
  },

  addTranslation: function(lang, trans) {
    if (typeof this.translations[lang] == 'undefined') this.translations[lang] = {};
    for (key in trans) this.translations[lang][key] = trans[key];
  },

  localizedString: function(key, env) {
    var trans = this.translations[this.language()][key] || this.translations.en[key] || key;
    if (env) {
      trans = trans.replace(/\$\{(\w+)\}/g, function(str, p1) {
        return (env[p1] || '?');
      });
    }
    return trans;
  },
};

//---------------------------------------------------------------------------
// Dialog

Config.Dialog = function(name, buildFunc, opts) {
  this.name = name;
  this._build = buildFunc;
  opts = (opts || {});
  this.saveKey = (opts.saveKey || name + '_config_data');
  delete opts.saveKey;
  this.callbacks = opts;

  this.defaults = {};
  this.settings = {};
  this.frame = null;
};

var dp = Config.Dialog.prototype;

dp.build = function() {
  // clear the defautls every time to detect config id collisions
  this.defaults = {};
  this.load();
  this.builder = new Config.Builder(this);
  this._build();
};

dp.dummyBuild = function() {
  // clear the defautls every time to detect config id collisions
  this.defaults = {};
  this.builder = new Config.DummyBuilder(this);
  this._build();
};

dp.load = function() {
  var data = GM_getValue(this.saveKey, '{}');
  try {
    this.settings = JSON.parse(data);
  } catch(e) {
    this.settings = (new Function("return (" + data + ")"))();
    JSON && JSON.stringify && this.save();
  }
};

dp.save = function() {
  var data = (JSON && JSON.stringify) ? JSON.stringify(this.settings) : this.settings.toSource();
  GM_setValue(this.saveKey, data);

  Config.debug && GM_log("\nUSCONFIG: DEBUG: SETTINGS SAVED for \"" + this.name +
    "\" with SAVEKEY \"" + this.saveKey + "\n" + this.settings.toSource());
};

dp.show = function() {
  if (!this.frame) return;
  this.frame.addEventListener('load', this._show, false);
  this.frame.src = "about:blank"; // fire
};

dp.center = function() {
  if (!this.frame) return;
  Config.center(this.frame);
};

dp.close = function(save) {
  if (!this.frame) return;
  if (!this.callback('beforeclose')) return;
  if (save) {
    if (!this.callback('beforesave')) return;
    // collect controls' values to save
    var settings = {};
    var type, value;
    for (id in this.defaults) {
      var doc = this.frame.contentDocument;
      var cntl = doc.getElementById('control_' + id);
      switch (cntl.type) {
      case 'checkbox': case 'text': case 'textarea':
        type = cntl.type;
        break;
      default:
        type = cntl.tagName.toLowerCase();
        break;
      }
      switch (type) {
      case 'checkbox':
        value = cntl.checked;
        break;
      case 'div': // radio buttons are grouped by <div>
        var radios = cntl.getElementsByTagName('input');
        for (var i = 0; i < radios.length; i++) {
          if (radios[i].checked) {
            value = radios[i].value;
            break;
          }
        }
        break;
      case 'select':
        var options = cntl.getElementsByTagName('option');
        for (var i = 0; i < options.length; i++) {
          if (options[i].selected) {
            value = options[i].textContent;
            break;
          }
        }
        break;
      case 'text': case 'textarea':
        value = cntl.value.replace(/^\s*/, '').replace(/\s*$/, '');
        if (!this.callback('validate_' + id, value)) return; // invalid input
        if (typeof this.defaults[id] == 'number') value = parseFloat(value);
        break;
      }
      settings[id] = value;
    }
    this.settings = settings;
    this.save();
    this.callback('aftersave');
  }
  this.remove();
  this.callback('afterclose');
  if (save && this.autoReload) location.reload();
};

dp.remove = function() {
  if (!this.frame) return;
  Config.remove(this.frame);
};

dp.reset = function() {
  if (!this.frame) return;
  var doc = this.frame.contentDocument;
  for (id in this.defaults) {
    var value = this.defaults[id];
    var cntl = doc.getElementById('control_' + id);
    switch (cntl.type) {
    case 'checkbox': case 'text': case 'textarea':
      type = cntl.type;
      break;
    default:
      type = cntl.tagName.toLowerCase();
      break;
    }
    switch (type) {
    case 'checkbox':
      cntl.checked = value;
      break;
    case 'div': // radio buttons are grouped by <div>
      var radios = cntl.getElementsByTagName('input');
      for (var i = 0; i < radios.length; i++) {
        if (value == radios[i].value) {
          radios[i].checked = true;
          break;
        }
      }
      break;
    case 'select':
      var options = cntl.getElementsByTagName('option');
      for (var i = 0; i < options.length; i++) {
        if (value == options[i].textContent) {
          options[i].selected = true;
          break;
        }
      }
      break;
    case 'text': case 'textarea':
      cntl.value = value.toString();
      break;
    }
  }
};

dp.callback = function(evt, arg) {
  try {
    if (this.callbacks[evt]) {
      return (this.callbacks[evt].call(this, arg) !== false);
    } else {
      return true;
    }
  } catch (e) {
    // for more detailed information
    GM_log("\nUSCONFIG: ERROR: CALLBACK FAILED: " +
      "\"" + evt + "\" on \"" + this.name + "\"\n" + e);
    throw e;
  }
};

delete dp;

//---------------------------------------------------------------------------
// Builder

Config.Builder = function(dlg) {
  this._dialog = dlg;
};

var bp = Config.Builder.prototype;

// Creates a config dialog.
//
bp.dialog = function(title /* , [attrs,] sections... */) {
  // exclusive control
  var frame = Config._frame(true);
  if (frame) {
    var style = frame.style;
    if (style.display == 'none' || style.opacity == '0') {
      // remove the zombie frame and continue
      Config.remove(frame);
    } else {
      // opening dialog exists
      GM_log("\nUSCONFIG: WARNING: OPENING DIALOG EXISTS");
      return;
    }
  }
  var _ = Config._;
  var args = this._parse(arguments, 1);
  var attrs = {
    width      : '75%',
    height     : '75%',
    theme      : 'default',
    gap        : 12,
    style      : '',
    autoReload : true,
  };
  this._merge(attrs, args.attrs);
  if (/\d+$/.test(attrs.width )) attrs.width  += 'px';
  if (/\d+$/.test(attrs.height)) attrs.height += 'px';
  attrs.theme = this._theme(attrs.theme);
  attrs.style = this._style(attrs.theme, attrs.gap) + attrs.style;
  this._dialog.autoReload = attrs.autoReload
  var sects = args.elems;

  // create the dialog frame
  frame = this._dialog.frame = this._create('iframe', {
    id    : 'usconfig_frame',
    style : 'width: ' + attrs.width + '; height: ' + attrs.height + '; ' +
      'max-width: 95%; max-height: 95%; display: none; opacity: 0; ' +
      'position: fixed; left: 0; top: 0; z-index: 9999; ' +
      'border: 4px solid #999999; background: ' + attrs.theme.bg_color + '; overflow: auto;',
  });
  document.body.appendChild(frame);
  // NOTE: This line's appendChild() fires a load event on the frame. But, it
  // will be ignored because the contentDocument of the frame hasn't created yet.

  var style = this._create('style', {
    type  : 'text/css',
    inner : attrs.style,
  });

  // create the dialog container
  var dcon = this._create('div', {
    klass : 'dialog_container',
    id    : this._dialog.name + '_config_dialog',
  });
  // append the dialog's title
  dcon.appendChild(this._create('div', {
    klass : 'dialog_title',
    inner : title,
  }));

  // append sections
  for (var i = 0; i < sects.length; i++) {
    this._checkElem(sects[i], 'div', 'section');
    dcon.appendChild(sects[i]);
  }

  // append dialog buttons
  var dlg  = this._dialog;
  var btns = this._create('div', { klass: 'button_bar' });
  // reset button
  btns.appendChild(this._create('button', {
    type  : 'button',
    klass : 'dialog_button',
    id    : 'reset_button',
    inner : _('Reset'),
    click : function() { dlg.reset(); },
  }));
  // save/cancel buttons
  var saveBtn = this._create('button', {
    type  : 'button',
    klass : 'dialog_button',
    id    : 'save_button',
    inner : _('Save'),
    click : function() { dlg.close(true); },
  });
  var cancelBtn = this._create('button', {
    type  : 'button',
    klass : 'dialog_button',
    id    : 'cancel_button',
    inner : _('Cancel'),
    click : function() { dlg.close(false); },
  });
  if (/Win/.test(navigator.platform)) {
    // Windows
    btns.appendChild(saveBtn);
    btns.appendChild(cancelBtn);
  } else {
    // Linux, Mac
    btns.appendChild(cancelBtn);
    btns.appendChild(saveBtn);
  }
  dcon.appendChild(btns);

  // closure
  dlg._show = function() {
    // NOTE: This function will be triggered by Dialog's show() method by
    // setting the src attribute of the frame to "about:blank".
    Config.debug && GM_log("\nUSCONFIG: DEBUG: LOAD EVENT for " + frame);
    // now, the frame has its contentDocument
    var head = frame.contentDocument.getElementsByTagName('head')[0];
    var body = frame.contentDocument.body;
    head.appendChild(style);
    body.style.margin  = '0';
    body.style.padding = '0';
    body.style.backgroundColor = "#ffffff";
    body.appendChild(dcon);
    // now the dialog is ready to show

    if (!dlg.callback('beforeopen')) {
      dlg.remove();
      return;
    }
    frame.style.display = 'block';
    dlg.center();
    frame.style.opacity = '1';
    dlg.callback('afteropen');
  };
};

// Creates a section.
//
bp.section = function(title /*, [desc,] grids... */) {
  var args = this._parse(arguments, 1);
  var desc = args.str;
  var grids = args.elems;

  var sect = this._create('div', { klass : 'section' });
  // append the section title
  var sect_title = this._create('div', {
    klass : 'section_title',
    inner : title,
  });
  sect.appendChild(sect_title);
  // append the section desc
  if (desc && /\S/.test(desc)) {
    var sect_desc = this._create('div', { klass: 'section_desc' });
    sect_desc.appendChild(this._create('p', {
      style : 'margin: 0px; padding: 0px',
      inner : desc,
    }));
    sect.appendChild(sect_desc);
  }
  // append grids
  for (var i = 0; i < grids.length; i++) {
    this._checkElem(grids[i], 'div', 'grid_container');
    sect.appendChild(grids[i]);
  }
  return sect;
};

// Creates a grid, which is a table element for layouting a group of fields
// nicely.
//
bp.grid = function(/* [attrs,] fields... */) {
  var args = this._parse(arguments, 0);
  var attrs = args.attrs;
  var align = this._pop(attrs, 'align', 'center');
  var layout = this._pop(attrs, 'layout', 'auto');
  var elems = args.elems;

  var gcon = this._create('div', {
    klass : 'grid_container',
    style : 'text-align: ' + align + ';',
  });

  this._merge(attrs, { klass: 'grid' });
  var tbl = this._create('table', attrs);
  var row = this._create('tr');
  if (layout == 'manual') {
    // manual layouting
    tbl.className += ' manual';
    var cell = this._create('td');
    for (var i = 0; i < elems.length; i++) {
      var elem = elems[i];
      if (elem == '\n' || elem == '|') {
        row.appendChild(cell);
        cell = this._create('td');
        if (elem == '\n') {
          tbl.appendChild(row);
          row = this._create('tr');
        }
        continue;
      }
      switch (elem.tagName.toLowerCase()) {
      case 'div':
        cell.appendChild(elem);
      case 'td':
        cell.appendChild(elem.firstChild);
        break;
      default:
        throw "\nUSCONFIG: SYNTAX ERROR: EXPECTED CELL but " + cell + "\n";
        break;
      }
    }
    row.appendChild(cell);
  } else {
    // automatic layouting
    for (var i = 0; i < elems.length; i++) {
      var cell = elems[i];
      if (cell == '\n') {
        tbl.appendChild(row);
        row = this._create('tr');
        continue;
      }
      switch (cell.tagName.toLowerCase()) {
      case 'div':
        cell = this._cells(cell)[0]; // fall through
      case 'td':
        row.appendChild(cell);
        break;
      default:
        throw "\nUSCONFIG: SYNTAX ERROR: EXPECTED CELL but " + cell + "\n";
        break;
      }
    }
  }
  tbl.appendChild(row);

  gcon.appendChild(tbl);
  return gcon;
};

// Creates a button.
//
bp.button = function(label, id /* , [attrs,] onclick, [tooltip] */) {
  var args = this._parse(arguments, 2);
  var attrs = args.attrs;
  if (args.func) attrs.onclick = args.func;
  if (args.str)  attrs.title = args.str;

  this._merge(attrs, {
    type  : 'button',
    klass : 'button',
    id    : 'button_' + id,
    name  : id,
    inner : label,
  });
  var btn = this._create('button', attrs);
  return this._cells(btn);
};

// Creates a checkbox.
//
bp.checkbox = function(label, id, _default /* , [attrs,] [tooltip] */) {
  this._setDefault(id, _default);
  var args = this._parse(arguments, 3);
  var attrs = args.attrs;
  if (args.str) attrs.title = args.str;
  var labelPos = this._pop(attrs, 'label', 'right');

  this._merge(attrs, {
    type  : 'checkbox',
    klass : 'control',
    id    : 'control_' + id,
    name  : id,
    value : id,
    check : this._getValue(id, _default),
  });
  var cbox = this._create('input', attrs);
  label = this._label(id, label);

  if (labelPos == 'left') {
    return this._cells(label, cbox);
  } else {
    return this._cells(cbox, label);
  }
};

// Creates a group of radio buttons. The created radio buttons are
// mutually exclusive.
//
bp.radio = function(label, id, options, _default /* , [attrs,] [tooltip] */) {
  this._setDefault(id, _default);
  var args = this._parse(arguments, 4);
  var attrs = args.attrs;
  if (args.str) attrs.title = args.str;

  this._merge(attrs, {
    klass: 'control',
       id: 'control_' + id,
  });
  var box = this._create('div', attrs);
  label = this._label(id, label);

  // append radios for each of options
  var value = this._getValue(id, _default);
  if (value == _default && options.indexOf(_default) == -1) {
    GM_log("\nUSCONFIG: WARNING: INVALID DEFAULT VALUE for \"" + id + "\"");
    value = options[0]; // fallback
  }
  for (var i = 0; i < options.length; i++) {
    box.appendChild(this._create('span',  { inner: options[i] }));
    box.appendChild(this._create('input', {
      type  : 'radio',
      klass : 'radio_' + id,
      id    : 'radio_' + id + '_' + (i + 1),
      name  : id,
      value : options[i],
      check : options[i] == value,
    }));
  }
  return this._cells(label, box);
};

// Creates a select control.
//
bp.select = function(label, id, options, _default /* , [attrs,] [tooltip] */) {
  this._setDefault(id, _default);
  var args = this._parse(arguments, 4);
  var attrs = args.attrs;
  if (args.str) attrs.title = args.str;

  this._merge(attrs, {
    klass : 'control',
    id    : 'control_' + id,
    name  : id,
  });
  delete attrs.multiple; // not support
  var slct = this._create('select', attrs);
  label = this._label(id, label);

  // append options
  var value = this._getValue(id, _default);
  if (value == _default && options.indexOf(_default) == -1) {
    GM_log("\nUSCONFIG: WARNING: INVALID DEFAULT VALUE for \"" + id + "\"");
    value = options[0]; // fallback
  }
  for (var i = 0; i < options.length; i++) {
    slct.appendChild(this._create('option', {
      klass  : 'option_' + id,
      id     : 'option_' + id + '_' + (i + 1),
      text   : options[i],
      select : options[i] == value,
    }));
  }
  return this._cells(label, slct);
};

// Creates a text field for a string value.
//
bp.text = function(label, id, _default /* , [attrs,] [tooltip,] [validateFunc] */) {
  var args = arguments;
  var cells = this._text(label, id, _default, args[3], args[4], args[5]);
  var callbacks = this._dialog.callbacks;
  if (!callbacks['validate_' + id]) {
    callbacks['validate_' + id] = Config.Builder.validator.forString(label);
  }
  return cells;
};

bp._text = function(label, id, _default /* , [attrs,] [tooltip,] [validateFunc] */) {
  this._setDefault(id, _default);
  var args = this._parse(arguments, 3);
  var attrs = { size: 6 };
  this._merge(attrs, args.attrs);
  if (args.str) attrs.title = args.str;
  var labelPos = this._pop(attrs, 'label', 'left');
  if (args.func) this._dialog.callbacks['validate_' + id] = args.func;

  this._merge(attrs, {
    type  : 'text',
    klass : 'control',
    id    : 'control_' + id,
    name  : id,
    value : this._getValue(id, _default),
  });
  var text = this._create('input', attrs);
  label = this._label(id, label);

  if (/^hid(e|den)$/.test(labelPos)) {
    return this._cells(text);
  } else {
    return this._cells(label, text);
  }
};

// Creates a text field for an integer value.
//
bp.integer = function(label, id, _default /* , [attrs,] [tooltip,] [validateFunc] */) {
  var args = arguments;
  var cells = this._text(label, id, _default, args[3], args[4], args[5]);
  var callbacks = this._dialog.callbacks;
  if (!callbacks['validate_' + id]) {
    callbacks['validate_' + id] = Config.Builder.validator.forInteger(label);
  }
  return cells;
};

// Creates a text field for a numeric value.
//
bp.number = function(label, id, _default /* , [attrs,] [tooltip,] [validateFunc] */) {
  var args = arguments;
  var cells = this._text(label, id, _default, args[3], args[4], args[5]);
  var callbacks = this._dialog.callbacks;
  if (!callbacks['validate_' + id]) {
    callbacks['validate_' + id] = Config.Builder.validator.forNumber(label);
  }
  return cells;
};

// Creates a textarea.
//
bp.textarea = function(label, id, _default /* , [attrs,] [tooltip,] [validateFunc] */) {
  this._setDefault(id, _default);
  var args = this._parse(arguments, 3);
  var attrs = { cols: 8, rows: 4 };
  this._merge(attrs, args.attrs);
  if (args.str) attrs.title = args.str;
  var labelPos = this._pop(attrs, 'label', 'left');
  this._dialog.callbacks['validate_' + id] =
    (args.func || Config.Builder.validator.forString(label));

  this._merge(attrs, {
    klass : 'control',
    id    : 'control_' + id,
    name  : id,
    value : this._getValue(id, _default),
  });
  var text  = this._create('textarea', attrs);
  label = this._label(id, label);

  var cells = [];
  if (/^hid(e|den)$/.test(labelPos)) {
    return this._cells(text);
  } else if (labelPos == 'top') {
    label.className += ' top';
    var wrapper = this._create('div');
    wrapper.appendChild(label);
    wrapper.appendChild(this._create('br'));
    wrapper.appendChild(text);
    return this._cells(wrapper);
  } else {
    return this._cells(label, text);
  }
};

// Creates a label for the control of _id_.
//
bp._label = function(id, text) {
  if (text) {
    var attrs = {
      klass : 'label',
      id    : 'label_' + id,
      for   : 'control_' + id,
      inner : text,
    };
    return this._create('label', attrs);
  } else {
    return null;
  }
};

// Creates a static text.
//
bp.staticText = function(text /* , [attrs,] */) {
  var args = this._parse(arguments, 1);
  var attrs = args.attrs;

  this._merge(attrs, {
    klass: 'static_text',
     text: text.replace(/\n/, '<br>'),
  });
  var text = this._create('span', attrs);
  return this._cells(text);
};

bp._cells = function(left, right) {
  var cells = [];
  if (left && right) {
    cells.push(this._create('td', { style: 'text-align: right;' }));
    cells.push(this._create('td'));
    cells[0].appendChild(left);
    cells[1].appendChild(right);
  } else {
    left = (left || right);
    cells.push(this._create('td'));
    cells[0].appendChild(left);
  }
  left.className += ' margin_left';
  return cells;
};

bp._create = function(tagName, attrs) {
  var elem = document.createElement(tagName);
  if (attrs) this._setAttrs(elem, attrs);
  return elem;
};

bp._setAttrs = function(elem, attrs) {
  for (var name in attrs) {
    var value = attrs[name];
    if (name.indexOf('on') == 0) {
      elem.addEventListener(name.substring(2), value, false);
    } else {
      switch (name) {
      case "for": case "href": case "id": case "name": case "src": case "style":
        elem.setAttribute(name, value);
        break;
      case "check" : elem.checked     = value; break;
      case "inner" : elem.innerHTML   = value; break;
      case "klass" : elem.className   = value; break;
      case "select": elem.selected    = value; break;
      case "text"  : elem.textContent = value; break;
      case "click" : elem.addEventListener("click", value, false); break;
      default:
        elem[name] = value;
        break;
      }
    }
  }
  return elem;
};

bp._setDefault = function(id, _default) {
  var defaults = this._dialog.defaults;
  if (typeof defaults[id] != 'undefined') {
    throw "\nUSCONFIG: SYNTAX ERROR: CONFIG ID CONFLICTED at \"" + id + "\"\n";
  }
  defaults[id] = _default;
};

bp._getValue = function(id, _default) {
  var value = this._dialog.settings[id];
  return (typeof value == 'undefined') ? _default : value;
};

bp._parse = function(passedArgs, fromIdx) {
  // flatten
  var args = [];
  for (var i = fromIdx; i < passedArgs.length; i++) {
    var val = passedArgs[i];
    if (typeof val == 'object' && val instanceof Array) {
      for (var j = 0; j < val.length; j++) {
        args.push(val[j]);
      }
    } else {
      args.push(val);
    }
  }
  var hash = { attrs: {}, elems: [] };
  for (var i = 0; i < args.length; i++) {
    var val = args[i];
    if (!val) break;
    // special values to control layouts
    if (val == '\n' || val == '|') hash.elems.push(val);
    switch (typeof val) {
    case 'function':
      hash.func = val;
      break;
    case 'object':
      if (val instanceof String) {
        hash.str = val;
      } else if (typeof val.tagName == 'string') {
        hash.elems.push(val);
      } else {
        hash.attrs = val;
      }
      break;
    case 'string':
      hash.str = val;
      break;
    default:
      throw "\nUSCONFIG: SYNTAX ERROR: UNEXPECTED TYPE VALUE: " + val + "\n";
      break;
    }
  }
  return hash;
};

bp._pop = function(attrs, name, _default) {
  var value = (typeof attrs[name] != 'undefined' ? attrs[name] : _default);
  delete attrs[name];
  return value;
};

bp._merge = function(a, b) {
  for (var key in b) a[key] = b[key];
};

bp._checkElem = function(elem, tagName, className) {
  if (!(typeof elem.tagName != 'undefined' &&
    elem.tagName.toLowerCase() == tagName && elem.className.indexOf(className) != -1)) {
    throw "\nUSCONFIG: SYNTAX ERROR: EXPECTED " + className.toUpperCase() + " but " + elem + "\n";
  }
};

// for convenience
bp._ = Config._ = function(key, env) { return Config.locale.localizedString(key, env); };

// factory of default validator functions
Config.Builder.validator = {

  forInteger: function(label) {
    return function(value) {
      if (!/^[+-]?\d+$/.test(value)) {
        var _ = Config._;
        alert(_('require_integer', {label:label}));
        return false;
      }
      return true;
    };
  },

  forNumber: function(label) {
    return function(value) {
      if (!/^[+-]?\d+(\.\d+([Ee][+-]?\d+)?)?$/.test(value)) {
        var _ = Config._;
        alert(_('require_number', {label:label}));
        return false;
      }
      return true;
    };
  },

  forString: function(label) {
    return function(value) {
      return true;
    };
  },
};

bp._theme = function(theme) {
  if (typeof theme == 'string' || (typeof theme == 'object' && theme instanceof String)) {
    var name = theme;
    theme = Config.Dialog.theme[name];
    if (!theme) throw "\nUSCONFIG: ERROR: UNKNOWN THEME: " + name;
  }
  return {
    bg_color                   : theme.bg_color                   || '#ffffff',
    fg_color                   : theme.fg_color                   || '#000000',
    title_border_width         : theme.title_border_width         || 0,
    title_border_color         : theme.title_border_color         || theme.bg_color || '#ffffff',
    title_bg_color             : theme.title_bg_color             || theme.bg_color || '#ffffff',
    title_fg_color             : theme.title_fg_color             || '#ffffff',
    section_title_border_width : theme.section_title_border_width || 1,
    section_title_border_color : theme.section_title_border_color || '#aaaaaa',
    section_title_bg_color     : theme.section_title_bg_color     || theme.main_color,
    section_title_fg_color     : theme.section_title_fg_color     || '#ffffff',
    section_desc_border_width  : theme.section_desc_border_width  || 1,
    section_desc_border_color  : theme.section_desc_border_color  || '#cccccc',
    section_desc_bg_color      : theme.section_desc_bg_color      || theme.sub_color,
    section_desc_fg_color      : theme.section_desc_fg_color      || '#474747',
    button_bar_border_width    : theme.button_bar_border_width    || 1,
    button_bar_border_color    : theme.button_bar_border_color    || '#cccccc',
    button_bar_bg_color        : theme.button_bar_bg_color        || theme.sub_color,
    button_bar_fg_color        : theme.button_bar_fg_color        || theme.fg_color || '#000000',
  };
};

bp._style = function(theme, gap) {
  var env = { gap: gap };
  this._merge(env, theme);

  // template
  var css = <><![CDATA[

    .dialog_container {
      margin:  0px;
      padding: 0px 0px <%gap*4%>px 0px;
      background: <%bg_color%>; color: <%fg_color%>;
    }
    .dialog_container * {
      font-family: arial,tahoma,myriad pro,sans-serif;
    }
    .dialog_title {
      width: 100%;
      margin: 0px; padding: 6px 0px;
      border-width: 0px 0px <%title_border_width%>px 0px;
      border-style: solid; border-color: <%title_border_color%>;
      text-align: center;
      font-size: 20pt;
    }

    .section {
      width: 100%;
      margin: 0px; padding: 0px 0px <%gap*2%>px 0px;
    }
    .section_title {
      width: 100%;
      margin: 0px; padding: 3px 0px;
      border-width: <%section_title_border_width%>px 0px;
      border-style: solid; border-color: <%section_title_border_color%>;
      background: <%section_title_bg_color%>; color: <%section_title_fg_color%>;
      text-align: center;
      font-size: 13pt;
    }
    .section_desc {
      width: 100%;
      margin: 0px; padding: 3px 0px;
      border-width: 0px 0px <%section_desc_border_width%>px 0px;
      border-style: solid; border-color: <%section_desc_border_color%>;
      background: <%section_desc_bg_color%>; color: <%section_desc_fg_color%>;
      text-align: center;
      font-size: 9pt;
    }
    .grid_container {
      width: 100%;
      margin: 0px; padding: 0px;
    }
    .grid {
      display: inline-table;
      border-collapse: collapse;
      margin: <%gap%>px <%gap%>px 0px <%gap%>px;
      position: relative; right: <%gap%>px;
    }
    .grid tr {
      vertical-align: middle;
    }
    .grid td {
      border: 0px; padding: <%gap/2%>px 0px 0px 0px;
    }
    .grid .grid {
      margin: 0px; padding: 0px;
      position: relative; right: 0px;
    }

    .button {
      display: inline-block;
      margin-left: <%gap%>px;
    }
    .label {
      display: inline-block;
      font-size: 9pt; font-weight: bold;
    }
    .label.top {
      margin-top: 4px; margin-bottom: 4px;
    }
    .control {
      display: inline-block;
    }
    div.control span {
      margin: 0px  4px 0px <%gap%>px;
      font-size: 10pt;
    }
    .manual input[type="checkbox"] {
      position: relative; top: 2px;
    }
    input[type="radio"] {
      margin: 0px; padding: 0px;
    }
    select {
      margin: 0px 4px; padding: 0px;
    }
    input[type="text"], textarea  {
      margin: 0px 0px 0px 4px; padding: 0px;
      font-size: 10pt;
    }
    .static_text {
      display: inline-block;
      margin: 0px 4px !important;
      font-size: 9pt;
    }

    .margin_left {
      margin: 0px 4px 0px <%gap%>px;
    }

    .button_bar {
      width: 100%;
      margin: 0px; padding: <%gap%>px 0px;
      border-width: <%button_bar_border_width%>px 0px 0px 0px;
      border-style: solid; border-color: <%button_bar_border_color%>;
      position: fixed; bottom: 0px; z-index: 999;
      background: <%button_bar_bg_color%>; color: <%button_bar_fg_color%>;
      text-align: right;
      vertical-align: middle;
    }
    .dialog_button {
      display: inline-block;
      margin-right: <%gap%>px;
    }
    #reset_button {
      float: left;
      margin-left: <%gap%>px;
      font-size: 9pt;
    }
  ]]></>.toString();

  with (env) {
    css = css.replace(/<%(.*?)%>/g, function(str, p1) {
      return eval(p1);
    });
  }
  Config.debug && GM_log("\nUSCONFIG: DEBUG: RENDERED CSS:\n" + css);
  return css;
};

delete bp;

//---------------------------------------------------------------------------
// DummyBuilder

Config.DummyBuilder = function(dlg) {
  this._dialog = dlg;
};

Config.DummyBuilder.prototype = new Config.Builder();
Config.DummyBuilder.prototype.constructor = Config.DummyBuilder;

var dbp = Config.DummyBuilder.prototype;

dbp.nop = function() {};
dbp.dialog = dbp.section = dbp.grid = dbp.button = dbp.staticText = dbp.nop;

dbp.checkbox = function(label, id, _default) { this._setDefault(id, _default); };
dbp.text = dbp.integer = dbp.number = dbp.textarea = dbp.checkbox;

dbp.radio = function(label, id, options, _default) { this._setDefault(id, _default); };
dbp.select = dbp.radio;

delete dbp;

//---------------------------------------------------------------------------
// Themes

Config.Dialog.theme = {
  default : { main_color: '#414141', sub_color: '#efefef' },
  blue    : { main_color: '#3333cc', sub_color: '#9999ff' },
  brown   : { main_color: '#990000', sub_color: '#cc6633' },
  cyan    : { main_color: '#00cccc', sub_color: '#99cccc' },
  green   : { main_color: '#339933', sub_color: '#99cc00' },
  magenta : { main_color: '#993399', sub_color: '#cc66cc' },
  navy    : { main_color: '#333399', sub_color: '#9999cc' },
  red     : { main_color: '#cc3333', sub_color: '#ff9999' },
};

//---------------------------------------------------------------------------
// Utility

Config.Util = {

  // Splits a string by each newlines (\n) and then returns an array of the
  // lines. The returned lines doesn't include any blank lines.
  //
  getLines: function(str) {
    var raw_lines = str.split("\n");
    var ret_lines = [];
    for (var i = 0; i < raw_lines.length; i++) {
      if (!raw_lines[i]) continue;
      ret_lines.push(raw_lines[i]);
    }
    return ret_lines;
  },

  // Creates an array of RegExps initialized with each of lines of _str_.
  //
  getPatterns: function(str, opts) {
    var lines = this.getLines(str);
    var patterns = [];
    if (!/^[gim]+$/.test(opts)) opts = '';
    for (var i = 0; i < lines.length; i++) {
      patterns.push(new RegExp(lines[i], opts));
    }
    return patterns;
  },
};

//---------------------------------------------------------------------------

window.addEventListener('resize', function() {
  Config.debug && GM_log("\nUSCONFIG: DEBUG: RESIZE EVENT for " + this);
  Config.center();
}, false);

window.addEventListener('unload', function() {
  Config.debug && GM_log("\nUSCONFIG: DEBUG: UNLOAD EVENT for " + this);
  Config.remove();
}, false);

// vim: filetype=javascript
