void function (global) {
  /**
   * Request a file content
   * @param {string}   path
   * @param {Function} callback(err, content)
   */
  function request(path, callback) {
    var xhr = new XMLHttpRequest()
    xhr.open('GET', path, true)
    xhr.onreadystatechange = function () {
      if (xhr.readyState < 4) return
      if (xhr.status >= 200 && xhr.status < 300) {
        callback(null, xhr.responseText)
      } else {
        callback(new Error(xhr.status, xhr.statusText))
      }
    }
    xhr.onerror = function (err) {
      callback(err)
    }
    xhr.send()
  }

  /**
   * Resolve a path from current
   * @param  {string} relative
   * @param  {string=location.path[1:]} current
   * @return {string} resolved
   */
  function resolve(relative, current) {
    current = current || location.pathname.substring(1)
    var dirs
    if (relative.charAt(0) == '.') { // Truly relative
      dirs = current.split('/')
      dirs.pop() // Pop the filename
    } else { // Absolute
      dirs = []
    }
    dirs = dirs.concat(relative.split('/'))

    // Clean dirs
    for (var i = 0, len = dirs.length; i < len; i++) {
      switch (dirs[i]) {
        case '': // breakthrough
        case '.': // ignore
          dirs.splice(i, 1)
          i -= 1
        break
        case '..':
          if (i == 0) { // ".." at start: ignore
            dirs.splice(i, 1)
            i -= 1
          } else {
            dirs.splice(i - 1, 2)
            i -= 2
          }
        break
      }
    }
    return dirs.join('/')
  }
  /**
   * Get all requires id of a content of JavaScript
   * @param  {string} JavaScript content
   * @return {Array.<string>} require ids
   */
  function getRequires(content) {
    var requireRE = /require\s*\(\s*(['"])(.+?)\1\s*\)/g
    var requires = []
    requireRE.lastIndex = 0;
    while (true) {
      var match = requireRE.exec(content)
      if (match == null) break
      requires.push(match[2])
    }
    return requires
  }

  /**
   * Creates a new Module
   * @class
   * @param {string} module id
   */
  function Module(id) {
    if (!(this instanceof Module))
      return new Module(id)

    var Cons = this.constructor

    if (Cons.key(id) in Cons.modules)
      throw new Error('Module id ' + id + ' already exists')
    Cons.modules[Cons.key(id)] = this
    this.id = id
  }

  /**
   * Store all modules
   * @type {Object.<string, Module>}
   */
  Module.modules = {}

  /**
   * Prefix of the module id
   * @type {String}
   */
  Module.PREFIX = 'mod_'

  /**
   * Get actual key of an module id.
   * In order to prevent a module
   * which has a reserved keyword id
   * @param  {string}
   * @return {string}
   */
  Module.key = function (id) {
    return this.PREFIX + id
  }

  /**
   * Get whether a module with the id is CREATED.
   * @param  {string}
   * @param  {number=0}
   * @return {boolean}
   */
  Module.has = function (id) {
    return this.key(id) in this.modules
  }

  /**
   * Get a specific module
   * @param  {string} id
   * @return {Module}
   */
  Module.get = function (id) {
    return this.modules[this.key(id)]
  }

  /**
   * Load content of module
   * Store content into `content` property
   * @param  {Function} callback.call(this, err)
   */
  Module.prototype.load = function (callback) {
    var self = this
    request('/' + resolve(this.id) + '.js', function (err, content) {
      if (err) {
        callback.call(self, err)
      } else {
        self.content = content
        callback.call(self)
      }
    })
  }

  /**
   * Analyse the requirements of module
   * Store requirements into `requires` property
   * `requires` is a key-value object:
   * - key is the require id in code
   * - value is the actual module id
   * @return {Module} this
   */
  Module.prototype.analyse = function () {
    var requires = getRequires(this.content)
    this.requires = {}
    for (var i = 0, l = requires.length; i < l; i++) {
      var requireId = requires[i]
      if (requireId in this.requires) continue
      this.requires[requireId] = resolve(requireId, this.id)
    }
    return this
  }

  /**
   * Load the require modules.
   * Replace the value of `requires` to the actual module
   * @param  {Function} callback.call(this)
   */
  Module.prototype.loadRequires = function (callback) {
    var self = this
    var loadCount = 0
    var Cons = this.constructor
    for (var requireId in this.requires) {
      var moduleId = this.requires[requireId]
      if (Cons.has(moduleId)) {
        this.requires[requireId] = Cons.get(moduleId)
        continue
      }

      loadCount += 1

      var module = new Cons(moduleId)
      this.requires[requireId] = module

      module.load(function (err) {
        if (err)
          return callback.call(self)
        this.analyse().loadRequires(function () {
          loadCount -= 1
          if (loadCount == 0)
            callback.call(self)
        })
      })
    }
    if (loadCount == 0) { // No unload modules
      setTimeout(function (self) {
        callback.call(self)
      }, 0, this)
    }
  }

  /**
   * Run the module
   * Store the Common JS module into
   * `commonJSModule` property
   */
  Module.prototype.run = function () {
    var self = this
    var Cons = this.constructor
    this.commonJSModule = {id: this.id, exports: {}}

    new Function('exports', 'require', 'module',
      this.content).call(global,
        this.commonJSModule.exports,  // exports
        function (requireId) {        // require
          if (this !== global)
            throw new Error('Require cannot be executed in non-global context.')
          if ( !(requireId in self.requires) )
            throw new Error('Invalid require format.')
          var requireModule = self.requires[requireId]
          if ( !('content' in requireModule) )
            throw new Error('Cannot load module "' + requireId + '"')
          if ( !('commonJSModule' in requireModule) )
            requireModule.run()
          return requireModule.commonJSModule.exports
        },
        this.commonJSModule)          // module
  }

  var useCommonJSModule = function (main, callback) {
    var module = new Module(resolve(main))
    module.load(function (err) {
      if (err) {
        console.error(err)
        return callback()
      }
      this.analyse().loadRequires(function () {
        this.run()
        callback(this.commonJSModule.exports)
      })
    })
  }

  useCommonJSModule.clearCache = function () {
    Module.modules = {}
  }

  global.useCommonJSModule = useCommonJSModule

} (this)