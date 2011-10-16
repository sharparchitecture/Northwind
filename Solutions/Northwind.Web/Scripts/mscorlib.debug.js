//! Script# Core Runtime
//! More information at http://projects.nikhilk.net/ScriptSharp
//!

///////////////////////////////////////////////////////////////////////////////
// Globals

window.ss = {
    version: '0.6.1.0',

    isUndefined: function(o) {
        return (o === undefined);
    },

    isNull: function(o) {
        return (o === null);
    },

    isNullOrUndefined: function(o) {
        return (o === null) || (o === undefined);
    }
};

(function() {
    function merge(target) {
        target = target || {};
        foreach(arguments, function(o) {
            if (o) {
                forIn(o, function(v, n) {
                    target[n] = v;
                });
            }
        }, 1);
        return target;
    }
    function forIn(obj, callback) {
        for (var x in obj) {
            callback(obj[x], x);
        }
    }
    function foreach(arr, callback, start) {
        var cancelled;
        if (arr) {
            if (!(arr instanceof Array ||
                  (typeof (arr.length) === 'number' &&
                   (typeof (arr.callee) === "function" || (arr.item && typeof (arr.nodeType) === "undefined") && !arr.addEventListener && !arr.attachEvent)))) {
                arr = [arr];
            }
            for (var i = start || 0, l = arr.length; i < l; i++) {
                if (callback(arr[i], i)) {
                    cancelled = true;
                    break;
                }
            }
        }
        return !cancelled;
    }

    var notLoading = 0, // not loading itself or any dependencies
        loading = 1,    // currently loading itself (dependencies have already loaded, executionDependencies may or may not be done)
        loadingCo = 2,  // loaded but waiting for executionDependencies
        loaded = 3,     // loaded self and all deps/codeps and execution callback executed
        attachEvent = !!document.attachEvent;

    function foreachScriptInfo(arr, callback) {
        var cancelled;
        if (arr) {
            for (var i = 0, l = arr.length; i < l; i++) {
                if (callback(getScriptInfo(arr[i]))) {
                    cancelled = true;
                    break;
                }
            }
        }
        return !cancelled;
    }
    function toIndex(arr) {
        // converts an array of strings into an object/index
        var obj = {};
        foreach(arr, function(name) {
            obj[name] = true;
        });
        return obj;
    }
    function getCompositeDependencies(composite, executionDependencies) {
        // gets the dependencies this composite script has by merging the dependencies of its
        // contained scripts, excluding any dependencies that are a part of the composite.
        var dependencies = [];
        foreachScriptInfo(composite.contains, function(scriptInfo) {
            foreach(lazyget(scriptInfo, executionDependencies ? "executionDependencies" : "dependencies"), function(name) {
                // composite.contains is an array of dependencies. _contains is a dictionary for fast lookup.
                // It was built when the composite was defined.
                if (!composite._contains[name]) dependencies.push(name);
            });
        });
        return dependencies;
    }
    function getDependencies(scriptInfo, executionDependencies) {
        // determines the dependencies this script has, taking into account it may have been selected
        // to be loaded as part of a composite script, or it may BE a composite script.
        // If so, its dependencies are the set of all dependencies of all the scripts in the composite
        // that are not within the composite.
        var dependencies;
        if (scriptInfo.contains) {
            dependencies = getCompositeDependencies(scriptInfo, executionDependencies);
        }
        else {
            var composite = scriptInfo._composite;
            if (composite) {
                dependencies = getCompositeDependencies(composite, executionDependencies);
            }
            else {
                dependencies = lazyget(scriptInfo, executionDependencies ? "executionDependencies" : "dependencies");
            }
        }
        return dependencies;
    }
    function requireParents(scriptInfo) {
        forIn(scriptInfo["_parents"], function(parentInfo) {
            // if any parent dependency is trying to load as part of a composite, the composite
            // should get the first chance to execute.
            forIn(parentInfo["_composites"], function(composite) {
                requireScript(composite, null, null, true);
            });
            requireScript(parentInfo, null, null, true);
        });
    }
    function getScriptInfo(name) {
        return resolveScriptInfo(name) || (ss.scripts[name] = { name: name });
    }
    function requireScript(scriptInfo, callback, session, readOnly) {
        return ss.loader._requireScript(scriptInfo, callback, session, readOnly);
    }
    function requireAll(scriptInfos, callback, session, readOnly) {
        var waiting;
        foreach(scriptInfos, function(dependency) {
            dependency = resolveScriptInfo(dependency);
            waiting |= requireScript(dependency, callback, session, readOnly);
        });
        return waiting;
    }
    function resolveScriptInfo(nameOrScriptInfo) {
        var info = typeof (nameOrScriptInfo) === "string" ?
                       (ss.scripts[nameOrScriptInfo] || ss.composites[nameOrScriptInfo]) :
                       (nameOrScriptInfo ? (nameOrScriptInfo.script || nameOrScriptInfo) : null);
        if (info && !info._isScript) {
            info = null;
        }
        return info;
    }
    function state(scriptInfo, newState) {
        var ret = (scriptInfo._state = newState || scriptInfo._state) || 0;
        // if this is a composite script, mirror the state it its contained scripts
        if (newState) {
            foreachScriptInfo(scriptInfo.contains, function(scriptInfo) {
                state(scriptInfo, newState);
            });
        }
        return ret;
    }
    function isLoaded(scriptInfo) {
        return !scriptInfo || (state(scriptInfo) > loadingCo);
    }
    function getAndDelete(obj, field) {
        var r = obj[field];
        delete obj[field];
        return r;
    }
    function foreachCall(obj, field, args) {
        // calls all the functions in an array of functions and deletes
        // the array from the containing object.
        foreach(getAndDelete(obj, field), function(callback) {
            callback.apply(null, args || []);
        });
    }
    function lazyget(obj, name, value) {
        // aids in lazily adding to an array or object that may not exist yet
        // also makes it simple to get a field from an object that may or may not be defined
        // e.g. lazyget(null, "foo") // undefined
        return obj ? (obj[name] = obj[name] || value) : value;
    }
    function lazypush(obj, name, value) {
        lazyget(obj, name, []).push(value);
    }
    function lazyset(obj, name, key, value) {
        lazyget(obj, name, {})[key] = value;
    }
    function listenOnce(target, name, ieName, callback, isReadyState, isScript) {
        function onEvent() {
            // this closure causes a circular reference with the dom element (target)
            // because it is added as a handler to the target, so target->onEvent,
            // and onEvent references the target through the parameter, onEvent->target.
            // However both sides are removed when the event fires -- the handler is removed
            // and the target is set to null.
            if (!attachEvent || !isReadyState || /loaded|complete/.test(target.readyState)) {
                if (attachEvent) {
                    target.detachEvent(ieName || ("on" + name), onEvent);
                }
                else {
                    target.removeEventListener(name, onEvent, false);
                    if (isScript) {
                        target.removeEventListener("error", onEvent, false);
                    }
                }
                callback.apply(target);
                target = null;
            }
        }
        if (attachEvent) {
            target.attachEvent(ieName || ("on" + name), onEvent);
        }
        else {
            target.addEventListener(name, onEvent, false);
            if (isScript) {
                target.addEventListener("error", onEvent, false);
            }
        }
    }
    function raiseDomReady() {
        if (ss._domReady) {
            var cb = getAndDelete(ss, "_domReadyQueue");
            foreach(cb, function(c) { c(); });
        }
    }
    function raiseOnReady() {
        var ready = ss._ready;
        if (!ready && ss._domReady && !(ss.loader && ss.loader._loading)) {
            ss._ready = ready = true;
        }
        if (ready) {
            var cb = getAndDelete(ss, "_readyQueue");
            foreach(cb, function(c) { c(); });
        }
    }
    var ssAPI = {
        debug: true,
        scripts: {},
        composites: {},
        _domLoaded: function() {
            function domReady() {
                if (!ss._domReady) {
                    ss._domReady = true;
                    raiseDomReady();
                    raiseOnReady();
                }
            }
            listenOnce(window, "load", null, domReady);

            var check;
            if (attachEvent) {
                if ((window == window.top) && document.documentElement.doScroll) {
                    // timer/doscroll trick works only when not in a frame
                    var timeout, er, el = document.createElement("div");
                    check = function() {
                        try {
                            el.doScroll("left");
                        }
                        catch (er) {
                            timeout = window.setTimeout(check, 0);
                            return;
                        }
                        el = null;
                        domReady();
                    };
                    check();
                }
                else {
                    // in a frame this is the only reliable way to fire before onload, however
                    // testing has shown it is not much better than onload if at all better.
                    // using a <script> element with defer="true" is much better, but you have to
                    // document.write it for the 'defer' to work, and that wouldnt work if this
                    // script is being loaded dynamically, a reasonable possibility.
                    // There is no known way of detecting whether the script is loaded dynamically or not.
                    listenOnce(document, null, "onreadystatechange", domReady, true);
                }
            }
            else if (document.addEventListener) {
                listenOnce(document, "DOMContentLoaded", null, domReady);
            }
        },
        onDomReady: function(callback) {
            lazypush(this, "_domReadyQueue", callback);
            raiseDomReady();
        },
        onReady: function(callback) {
            lazypush(this, "_readyQueue", callback);
            raiseOnReady();
        },
        require: function(features, completedCallback, userContext) {
            // create a unique ID for this require session, used to ensure we are listening to
            // each script on each iteration only once.
            var session = ss.loader._session++,
                iterating,
                loaded;
            function raiseCallback() {
                // call the callback but not if the dom isn't ready
                if (completedCallback) {
                    ss.onDomReady(function() { completedCallback(features, userContext) });
                }
            }
            function allLoaded() {
                // called each time any script from the scripts list or their descendants are loaded.
                // Each time we re-play the requires operation, which allows us to recalculate the dependency
                // tree in case a loaded script has added to it, and also to recalculate additional composites
                // to load. It also makes it possible for the parent scripts of any given types to change.

                // Note that when scripts are loading simultaniously, the browser will sometimes execute 
                // more than one script before raising the scriptElement.load/readyStateChange event, which means
                // two or more script-loader aware scripts might all call registerScript() before the 'getHandler'
                // method for the first fires. In that scenario, once the handler does get called for the executed
                // scripts, they will all call this 'allLoaded' handler, and all might find that all the required
                // scripts have been loaded. To simply protect against calling the callback multiple times, we 
                // just ensure it is called once.
                if (!loaded && !iterating && !iteration()) {
                    loaded = true;
                    raiseCallback();
                }
                // when the loader is finished after the domready event, it should
                // raise the ready event.
                raiseOnReady();
            }
            function iteration() {
                iterating = true;
                var resolvedScripts = [];
                foreach(features, function(feature) {
                    feature = resolveScriptInfo(feature);
                    if (feature) {
                        var contains = feature.contains;
                        if (contains) {
                            foreachScriptInfo(contains, function(scriptInfo) {
                                resolvedScripts.push(scriptInfo);
                            });
                        }
                        else {
                            resolvedScripts.push(feature);
                        }
                    }
                });
                if (ss.loader.combine) {
                    ss.loader._findComposites(resolvedScripts);
                }
                var waiting = requireAll(resolvedScripts, allLoaded, session);
                iterating = false;
                return waiting;
            }
            allLoaded();
        },
        loadScripts: function(scriptUrls, completedCallback, userContext) {
            this.loader._loadScripts(scriptUrls, completedCallback, userContext);
        },
        loader: {
            combine: true,
            basePath: null,
            _loading: 0,
            _session: 0,
            _init: function() {
                var scripts = document.getElementsByTagName("script"),
                selfUrl = scripts.length ? scripts[scripts.length - 1].src : null;
                this.basePath = selfUrl ? (selfUrl.slice(0, selfUrl.lastIndexOf("/"))) : "";
            },
            _loadSrc: function(src, callback) {
                var script = merge(document.createElement('script'), { type: 'text/javascript', src: src }),
                    loaded = lazyget(this, "_loadedScripts", {});
                // First take inventory of all the script elements on the page so we can quickly detect whether a particular script has already
                // loaded or not. This is done frequently in case a script element is added by any other means separate from the loader.
                // For example, a script that loads could create a script element when it executes.
                // Urls found are stored in _loadedScripts so even script elements that have been removed will be remembered.
                foreach(document.getElementsByTagName("script"), function(script) {
                    var src = script.src;
                    if (src) loaded[src] = true;
                });
                if (loaded[script.src]) {
                    if (callback) callback();
                }
                else {
                    listenOnce(script, "load", "onreadystatechange", callback, true, true);
                    this._loading++;
                    loaded[script.src] = true;
                    document.getElementsByTagName("head")[0].appendChild(script);
                }
            },
            _load: function(scriptInfo, callback, session) {
                var waiting;
                if (isLoaded(scriptInfo)) {
                    callback();
                }
                else {
                    waiting = true;
                    var notifyList = lazyget(scriptInfo, "_notify", []),
                        key = "session" + session;
                    if (!notifyList[key]) {
                        notifyList[key] = true;
                        notifyList.push(callback);
                    }
                    if (state(scriptInfo) < loading) {
                        state(scriptInfo, loading);
                        this._loadSrc(this._getUrl(scriptInfo), this._getHandler(scriptInfo));
                    }
                }
                return waiting;
            },
            _getUrl: function(scriptInfo) {
                var debug = ss.debug,
                    name = scriptInfo.name,
                    path = (debug ? (scriptInfo.debugUrl || scriptInfo.releaseUrl) : scriptInfo.releaseUrl).replace(/\{0\}/, name) || "";
                if (path.substr(0, 2) === "%/") {
                    var basePath = this.basePath,
                        hasSlash = (basePath.charAt(basePath.length - 1) === "/");
                    path = basePath + (hasSlash ? "" : "/") + path.substr(2);
                }
                return path;
            },
            _getHandler: function(scriptInfo) {
                return function() {
                    // this === <script> element
                    ss.loader._loading--;
                    if (state(scriptInfo) < loadingCo) {
                        // dont do this if its already marked as 'loaded',
                        // which may happen if the script contains a registerScript() call.
                        state(scriptInfo, loadingCo);
                    }
                    foreachCall(scriptInfo, "_notify");
                    // if it is a composite also notify anyone waiting on any of its contained scripts
                    foreachScriptInfo(scriptInfo.contains, function(scriptInfo) {
                        foreachCall(scriptInfo, "_notify");
                    });
                }
            },
            _findComposites: function(scripts) {
                // given a list of top level required scripts, determines all the composite scripts that should load during the process
                // of loading those scripts. Returns an index indicating for each script in the dependency tree, which composite script
                // should load in its place.
                var scriptSet = {},
                    compositeMapping = {},
                    foundAny;
                // first filter out already loaded scripts and expand their dependencies, building
                // up the 'scriptSet' index.
                function visit(script) {
                    script = resolveScriptInfo(script);
                    var currentState = state(script);
                    if (currentState < loading && !script._composite) {
                        // unloaded script, eligible for composite selection
                        scriptSet[script.name] = script;
                        foundAny = true;
                        foreach(script["dependencies"], visit);
                    }
                    if (currentState < loaded) {
                        // this scripts executionDependencies may not be loaded,
                        // also check them for composite candidates
                        foreach(script["executionDependencies"], visit);
                    }
                }
                foreach(scripts, visit);
                if (foundAny) {
                    // scriptSet is now a dictionary of every unloaded dependency in the tree
                    // not already designated to load as part of a composite script.
                    // now enumerate all composites looking for those that contain nothing but
                    // scripts in this set.
                    forIn(ss.composites, function(composite) {
                        if (foreachScriptInfo(composite.contains, function(contained) {
                            if (!scriptSet[contained.name]) {
                                return true;
                            }
                        })) {
                            // all of the scripts this composite contains need to be loaded.
                            // But selecting this composite for the scripts it contains could offset
                            // other previously selected composites (in this same execution context)
                            // that contain any of the same scripts.
                            // To ensure maximum coverage of scripts within composites, only select this
                            // composite if doing so would result in less http requests. The number of http
                            // requests saved by a composite is the number of scripts it contains, minus 1.
                            // For example, a composite of 3 scripts takes 1 request, normally 3. 3-1=2.
                            var offsets = {}, offsetCount = 0;
                            foreach(composite.contains, function(name) {
                                var otherCandidate = compositeMapping[name];
                                if (otherCandidate && !offsets[otherCandidate.name]) {
                                    offsets[otherCandidate.name] = otherCandidate;
                                    offsetCount += otherCandidate.contains.length - 1;
                                }
                            });
                            if (composite.contains.length - 1 > offsetCount) {
                                // if offsetting a previously selected composite, unselect that composite
                                // for each of its contains.
                                forIn(offsets, function(offset) {
                                    foreach(offset.contains, function(name) {
                                        delete compositeMapping[name];
                                    });
                                });
                                // select this composite for each script it contains
                                foreach(composite.contains, function(name) {
                                    compositeMapping[name] = composite;
                                });
                            }
                        }
                    });
                    forIn(compositeMapping, function(composite, name) {
                        ss.scripts[name]._composite = composite;
                    });
                }
            },
            _loadScripts: function(scriptUrls, completedCallback, userContext) {
                var index = -1, loaded = lazyget(this, "_loadedScripts", {});
                // clone the array so outside changes to it do not affect this asynchronous enumeration of it
                scriptUrls = scriptUrls instanceof Array ? Array.apply(null, scriptUrls) : [scriptUrls];
                function scriptLoaded(first) {
                    if (!first) ss.loader._loading--;
                    if (++index < scriptUrls.length) {
                        ss.loader._loadSrc(scriptUrls[index], scriptLoaded);
                    }
                    else {
                        if (completedCallback) {
                            completedCallback(scriptUrls, userContext);
                        }
                        raiseOnReady();
                    }
                }
                scriptLoaded(true);
            },
            _requireScript: function(scriptInfo, callback, session, readOnly) {
                // readonly: caller is only interested in knowing if this script is ready for it's execution callback,
                // it should not cause any dependencies to start loading. If it is, it is executed.
                var waiting;
                if (!isLoaded(scriptInfo)) {
                    var waitForDeps = requireAll(getDependencies(scriptInfo), callback, session, readOnly),
                        waitForDepsCo = requireAll(getDependencies(scriptInfo, true), callback, session, readOnly);
                    if (!waitForDeps && !waitForDepsCo && state(scriptInfo) === loadingCo) {
                        // the script has no more dependencies, executionDependencies, itself has already loaded,
                        // but has not yet been confirmed to have been loaded. This is it.
                        // A script that supports executionDependencies might also support an 'execution callback',
                        // a wrapper function that allows us to load the script without executing it.
                        // We then call the callback once its executionDependencies have loaded.
                        state(scriptInfo, loaded);
                        // there can be only one, but this is a dirty trick to call this field if it exists
                        // and delete it in a consise way.
                        foreachCall(scriptInfo, "_callback");
                        // Now that this script has loaded, see if any of its parent scripts are waiting for it
                        // We only need to do this in readOnly mode since otherwise, a require() call is coming
                        // again anyway.
                        if (readOnly) {
                            var contains = scriptInfo.contains;
                            if (contains) {
                                foreachScriptInfo(contains, function(scriptInfo) {
                                    requireParents(scriptInfo);
                                });
                            }
                            else {
                                requireParents(getScriptInfo(scriptInfo));
                            }
                        }
                    }
                    else if (!readOnly && !waitForDeps) {
                        // if all dependencies are loaded & executed, now load this script,
                        // or the dependency it was selected for. Some executionDependencies may still be loading
                        this._load(scriptInfo._composite || scriptInfo, callback, session);
                    }
                    waiting |= (waitForDeps || waitForDepsCo);
                }
                return waiting || !isLoaded(scriptInfo);
            },
            _registerParents: function(scriptInfo) {
                // tell each script it depends on that this script depends on it
                function register(dependency) {
                    var depInfo = getScriptInfo(dependency);
                    lazyset(depInfo, "_parents", scriptInfo.name, scriptInfo);
                }
                foreach(scriptInfo["dependencies"], register);
                foreach(scriptInfo["executionDependencies"], register);
            },
            defineScript: function(scriptInfo) {
                var scripts = ss.scripts,
                    name = scriptInfo.name,
                    contains = scriptInfo.contains;
                if (contains) {
                    var composites = ss.composites;
                    composites[name] = scriptInfo = merge(composites[name], scriptInfo);
                    // create an index of its contents for more efficient lookup later
                    scriptInfo._contains = toIndex(contains);
                    // tell each script it contains that it is a part of this composite script
                    foreachScriptInfo(contains, function(contain) {
                        lazyset(contain, "_composites", name, scriptInfo);
                    });
                }
                else {
                    scriptInfo = scripts[name] = merge(scripts[name], scriptInfo);
                    this._registerParents(scriptInfo);
                }
                if (scriptInfo.isLoaded) {
                    scriptInfo._state = loaded;
                }
                scriptInfo._isScript = true;
            },
            defineScripts: function(defaultScriptInfo, scriptInfos) {
                foreach(scriptInfos, function(scriptInfo) {
                    ss.loader.defineScript(merge(null, defaultScriptInfo, scriptInfo));
                });
            },
            registerScript: function(name, executionDependencies, executionCallback) {
                var scriptInfo = getScriptInfo(name);
                scriptInfo._callback = executionCallback;
                var existingList = lazyget(scriptInfo, "executionDependencies", []),
                    existing = toIndex(existingList);
                // add only the items that don't already exist
                foreach(executionDependencies, function(executionDependency) {
                    if (!existing[executionDependency]) {
                        existingList.push(executionDependency);
                    }
                });
                this._registerParents(scriptInfo);

                // the getHandler() script element event listener also sets the next state and calls
                // the execution callback. But we do it here also since this might occur when a script
                // loader script is referenced statically without an explicit call to load it, in which
                // case there is no script element listener.
                state(scriptInfo, loadingCo);
                requireScript(scriptInfo, null, null, true);
            }
        } // loader
    };
    merge(ss, ssAPI);

    ss.loader._init();
    ss._domLoaded();
})();

///////////////////////////////////////////////////////////////////////////////
// Object Extensions

Object.__typeName = 'Object';
Object.__baseType = null;

Object.getKeyCount = function Object$getKeyCount(d) {
    var count = 0;
    for (var n in d) {
        count++;
    }
    return count;
}

Object.clearKeys = function Object$clearKeys(d) {
    for (var n in d) {
        delete d[n];
    }
}

Object.keyExists = function Object$keyExists(d, key) {
    return d[key] !== undefined;
}

///////////////////////////////////////////////////////////////////////////////
// Function Extensions

Function.prototype.invoke = function Function$invoke() {
    return this.apply(null, arguments);
}

///////////////////////////////////////////////////////////////////////////////
// Boolean Extensions

Boolean.__typeName = 'Boolean';

Boolean.parse = function Boolean$parse(s) {
    return (s.toLowerCase() == 'true');
}

///////////////////////////////////////////////////////////////////////////////
// Number Extensions

Number.__typeName = 'Number';

Number.parse = function Number$parse(s) {
    if (!s || !s.length) {
        return 0;
    }
    if ((s.indexOf('.') >= 0) || (s.indexOf('e') >= 0) ||
        s.endsWith('f') || s.endsWith('F')) {
        return parseFloat(s);
    }
    return parseInt(s, 10);
}

Number.prototype.format = function Number$format(format) {
    if (ss.isNullOrUndefined(format) || (format.length == 0) || (format == 'i')) {
        return this.toString();
    }
    return this._netFormat(format, false);
}

Number.prototype.localeFormat = function Number$format(format) {
    if (ss.isNullOrUndefined(format) || (format.length == 0) || (format == 'i')) {
        return this.toLocaleString();
    }
    return this._netFormat(format, true);
}

Number._commaFormat = function Number$_commaFormat(number, groups, decimal, comma) {
    var decimalPart = null;
    var decimalIndex = number.indexOf(decimal);
    if (decimalIndex > 0) {
        decimalPart = number.substr(decimalIndex);
        number = number.substr(0, decimalIndex);
    }

    var negative = number.startsWith('-');
    if (negative) {
        number = number.substr(1);
    }

    var groupIndex = 0;
    var groupSize = groups[groupIndex];
    if (number.length < groupSize) {
        return decimalPart ? number + decimalPart : number;
    }

    var index = number.length;
    var s = '';
    var done = false;
    while (!done) {
        var length = groupSize;
        var startIndex = index - length;
        if (startIndex < 0) {
            groupSize += startIndex;
            length += startIndex;
            startIndex = 0;
            done = true;
        }
        if (!length) {
            break;
        }
        
        var part = number.substr(startIndex, length);
        if (s.length) {
            s = part + comma + s;
        }
        else {
            s = part;
        }
        index -= length;

        if (groupIndex < groups.length - 1) {
            groupIndex++;
            groupSize = groups[groupIndex];
        }
    }

    if (negative) {
        s = '-' + s;
    }    
    return decimalPart ? s + decimalPart : s;
}

Number.prototype._netFormat = function Number$_netFormat(format, useLocale) {
    var nf = useLocale ? ss.CultureInfo.CurrentCulture.numberFormat : ss.CultureInfo.InvariantCulture.numberFormat;

    var s = '';    
    var precision = -1;
    
    if (format.length > 1) {
        precision = parseInt(format.substr(1));
    }

    var fs = format.charAt(0);
    switch (fs) {
        case 'd': case 'D':
            s = parseInt(Math.abs(this)).toString();
            if (precision != -1) {
                s = s.padLeft(precision, '0');
            }
            if (this < 0) {
                s = '-' + s;
            }
            break;
        case 'x': case 'X':
            s = parseInt(Math.abs(this)).toString(16);
            if (fs == 'X') {
                s = s.toUpperCase();
            }
            if (precision != -1) {
                s = s.padLeft(precision, '0');
            }
            break;
        case 'e': case 'E':
            if (precision == -1) {
                s = this.toExponential();
            }
            else {
                s = this.toExponential(precision);
            }
            if (fs == 'E') {
                s = s.toUpperCase();
            }
            break;
        case 'f': case 'F':
        case 'n': case 'N':
            if (precision == -1) {
                precision = nf.numberDecimalDigits;
            }
            s = this.toFixed(precision).toString();
            if (precision && (nf.numberDecimalSeparator != '.')) {
                var index = s.indexOf('.');
                s = s.substr(0, index) + nf.numberDecimalSeparator + s.substr(index + 1);
            }
            if ((fs == 'n') || (fs == 'N')) {
                s = Number._commaFormat(s, nf.numberGroupSizes, nf.numberDecimalSeparator, nf.numberGroupSeparator);
            }
            break;
        case 'c': case 'C':
            if (precision == -1) {
                precision = nf.currencyDecimalDigits;
            }
            s = Math.abs(this).toFixed(precision).toString();
            if (precision && (nf.currencyDecimalSeparator != '.')) {
                var index = s.indexOf('.');
                s = s.substr(0, index) + nf.currencyDecimalSeparator + s.substr(index + 1);
            }
            s = Number._commaFormat(s, nf.currencyGroupSizes, nf.currencyDecimalSeparator, nf.currencyGroupSeparator);
            if (this < 0) {
                s = String.format(nf.currencyNegativePattern, s);
            }
            else {
                s = String.format(nf.currencyPositivePattern, s);
            }
            break;
        case 'p': case 'P':
            if (precision == -1) {
                precision = nf.percentDecimalDigits;
            }
            s = (Math.abs(this) * 100.0).toFixed(precision).toString();
            if (precision && (nf.percentDecimalSeparator != '.')) {
                var index = s.indexOf('.');
                s = s.substr(0, index) + nf.percentDecimalSeparator + s.substr(index + 1);
            }
            s = Number._commaFormat(s, nf.percentGroupSizes, nf.percentDecimalSeparator, nf.percentGroupSeparator);
            if (this < 0) {
                s = String.format(nf.percentNegativePattern, s);
            }
            else {
                s = String.format(nf.percentPositivePattern, s);
            }
            break;
    }

    return s;
}

///////////////////////////////////////////////////////////////////////////////
// Math Extensions

Math.truncate = function Math$truncate(n) {
    return (n >= 0) ? Math.floor(n) : Math.ceil(n);
}

///////////////////////////////////////////////////////////////////////////////
// String Extensions

String.__typeName = 'String';
String.Empty = '';

String.compare = function String$compare(s1, s2, ignoreCase) {
    if (ignoreCase) {
        if (s1) {
            s1 = s1.toUpperCase();
        }
        if (s2) {
            s2 = s2.toUpperCase();
        }
    }
    s1 = s1 || '';
    s2 = s2 || '';

    if (s1 == s2) {
        return 0;
    }
    if (s1 < s2) {
        return -1;
    }
    return 1;
}

String.prototype.compareTo = function String$compareTo(s, ignoreCase) {
    return String.compare(this, s, ignoreCase);
}

String.concat = function String$concat() {
    if (arguments.length === 2) {
        return arguments[0] + arguments[1];
    }
    return Array.prototype.join.call(arguments, '');
}

String.prototype.endsWith = function String$endsWith(suffix) {
    if (!suffix.length) {
        return true;
    }
    if (suffix.length > this.length) {
        return false;
    }
    return (this.substr(this.length - suffix.length) == suffix);
}

String.equals = function String$equals1(s1, s2, ignoreCase) {
    return String.compare(s1, s2, ignoreCase) == 0;
}

String._format = function String$_format(format, values, useLocale) {
    if (!String._formatRE) {
        String._formatRE = /(\{[^\}^\{]+\})/g;
    }

    return format.replace(String._formatRE,
                          function(str, m) {
                              var index = parseInt(m.substr(1));
                              var value = values[index + 1];
                              if (ss.isNullOrUndefined(value)) {
                                  return '';
                              }
                              if (value.format) {
                                  var formatSpec = null;
                                  var formatIndex = m.indexOf(':');
                                  if (formatIndex > 0) {
                                      formatSpec = m.substring(formatIndex + 1, m.length - 1);
                                  }
                                  return useLocale ? value.localeFormat(formatSpec) : value.format(formatSpec);
                              }
                              else {
                                  return useLocale ? value.toLocaleString() : value.toString();
                              }
                          });
}

String.format = function String$format(format) {
    return String._format(format, arguments, /* useLocale */ false);
}

String.fromChar = function String$fromChar(ch, count) {
    var s = ch;
    for (var i = 1; i < count; i++) {
        s += ch;
    }
    return s;
}

String.prototype.htmlDecode = function String$htmlDecode() {
    if (!String._htmlDecRE) {
        String._htmlDecMap = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"' };
        String._htmlDecRE = /(&amp;|&lt;|&gt;|&quot;)/gi;
    }

    var s = this;
    s = s.replace(String._htmlDecRE,
                  function String$htmlDecode$replace(str, m) {
                      return String._htmlDecMap[m];
                  });
    return s;
}

String.prototype.htmlEncode = function String$htmlEncode() {
    if (!String._htmlEncRE) {
        String._htmlEncMap = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
        String._htmlEncRE = /([&<>"])/g;
    }

    var s = this;
    if (String._htmlEncRE.test(s)) {
        s = s.replace(String._htmlEncRE,
                      function String$htmlEncode$replace(str, m) {
                          return String._htmlEncMap[m];
                      });
    }
    return s;
}

String.prototype.indexOfAny = function String$indexOfAny(chars, startIndex, count) {
    var length = this.length;
    if (!length) {
        return -1;
    }

    startIndex = startIndex || 0;
    count = count || length;

    var endIndex = startIndex + count - 1;
    if (endIndex >= length) {
        endIndex = length - 1;
    }

    for (var i = startIndex; i <= endIndex; i++) {
        if (chars.indexOf(this.charAt(i)) >= 0) {
            return i;
        }
    }
    return -1;
}

String.prototype.insert = function String$insert(index, value) {
    if (!value) {
        return this;
    }
    if (!index) {
        return value + this;
    }
    var s1 = this.substr(0, index);
    var s2 = this.substr(index);
    return s1 + value + s2;
}

String.isNullOrEmpty = function String$isNullOrEmpty(s) {
    return !s || !s.length;
}

String.prototype.lastIndexOfAny = function String$lastIndexOfAny(chars, startIndex, count) {
    var length = this.length;
    if (!length) {
        return -1;
    }

    startIndex = startIndex || length - 1;
    count = count || length;

    var endIndex = startIndex - count + 1;
    if (endIndex < 0) {
        endIndex = 0;
    }

    for (var i = startIndex; i >= endIndex; i--) {
        if (chars.indexOf(this.charAt(i)) >= 0) {
            return i;
        }
    }
    return -1;
}

String.localeFormat = function String$localeFormat(format) {
    return String._format(format, arguments, /* useLocale */ true);
}

String.prototype.padLeft = function String$padLeft(totalWidth, ch) {
    if (this.length < totalWidth) {
        ch = ch || ' ';
        return String.fromChar(ch, totalWidth - this.length) + this;
    }
    return this;
}

String.prototype.padRight = function String$padRight(totalWidth, ch) {
    if (this.length < totalWidth) {
        ch = ch || ' ';
        return this + String.fromChar(ch, totalWidth - this.length);
    }
    return this;
}

String.prototype.quote = function String$quote() {
    if (!String._quoteMap) {
        String._quoteMap = { '\\' : '\\\\',
                             '\'' : '\\\'', '"' : '\\"',
                             '\r' : '\\r', '\n' : '\\n', '\t' : '\\t', '\f' : '\\f',
                             '\b' : '\\b' };
    }
    if (!String._quoteRE) {
        String._quoteRE = new RegExp("([\'\"\\\\\x00-\x1F\x7F-\uFFFF])", "g");
    }
    else {
        String._quoteRE.lastIndex = 0;
    }

    var s = this;
    if (String._quoteRE.test(s)) {
        s = this.replace(String._quoteRE,
                         function String$quote$replace(str, m) {
                             var c = String._quoteMap[m];
                             if (c) {
                                 return c;
                             }
                             c = m.charCodeAt(0);
                             return '\\u' + c.toString(16).toUpperCase().padLeft(4, '0');
                         });
    }
    return '"' + s + '"';
}

String.prototype.remove = function String$remove(index, count) {
    if (!count || ((index + count) > this.length)) {
        return this.substr(0, index);
    }
    return this.substr(0, index) + this.substr(index + count);
}

String.prototype.replaceAll = function String$replaceAll(oldValue, newValue) {
    newValue = newValue || '';
    return this.split(oldValue).join(newValue);
}

String.prototype.startsWith = function String$startsWith(prefix) {
    if (!prefix.length) {
        return true;
    }
    if (prefix.length > this.length) {
        return false;
    }
    return (this.substr(0, prefix.length) == prefix);
}

if (!String.prototype.trim) {
  String.prototype.trim = function String$trim() {
      return this.trimEnd().trimStart();
  }

  String.prototype.trimEnd = function String$trimEnd() {
      return this.replace(/\s*$/, '');
  }

  String.prototype.trimStart = function String$trimStart() {
      return this.replace(/^\s*/, '');
  }
}

String.prototype.unquote = function String$unquote() {
    return eval('(' + this + ')');
}

///////////////////////////////////////////////////////////////////////////////
// Array Extensions

Array.__typeName = 'Array';
Array.__interfaces = [ ss.IEnumerable ];

Array.prototype.add = function Array$add(item) {
    this[this.length] = item;
}

Array.prototype.addRange = function Array$addRange(items) {
    this.push.apply(this, items);
}

Array.prototype.aggregate = function Array$aggregate(seed, callback, instance) {
    var length = this.length;
    for (var i = 0; i < length; i++) {
        if (i in this) {
            seed = callback.call(instance, seed, this[i], i, this);
        }
    }
    return seed;
}

Array.prototype.clear = function Array$clear() {
    this.length = 0;
}

Array.prototype.clone = function Array$clone() {
    if (this.length === 1) {
        return [this[0]];
    }
    else {
        return Array.apply(null, this);
    }
}

Array.prototype.contains = function Array$contains(item) {
    var index = this.indexOf(item);
    return (index >= 0);
}

Array.prototype.dequeue = function Array$dequeue() {
    return this.shift();
}

Array.prototype.enqueue = function Array$enqueue(item) {
    // We record that this array instance is a queue, so we
    // can implement the right behavior in the peek method.
    this._queue = true;
    this.push(item);
}

Array.prototype.peek = function Array$peek() {
    if (this.length) {
        var index = this._queue ? 0 : this.length - 1;
        return this[index];
    }
    return null;
}

if (!Array.prototype.every) {
    Array.prototype.every = function Array$every(callback, instance) {
        var length = this.length;
        for (var i = 0; i < length; i++) {
            if (i in this && !callback.call(instance, this[i], i, this)) {
                return false;
            }
        }
        return true;
    }
}

Array.prototype.extract = function Array$extract(index, count) {
    if (!count) {
        return this.slice(index);
    }
    return this.slice(index, index + count);
}

if (!Array.prototype.filter) {
    Array.prototype.filter = function Array$filter(callback, instance) {
        var length = this.length;    
        var filtered = [];
        for (var i = 0; i < length; i++) {
            if (i in this) {
                var val = this[i];
                if (callback.call(instance, val, i, this)) {
                    filtered.push(val);
                }
            }
        }
        return filtered;
    }
}

if (!Array.prototype.forEach) {
    Array.prototype.forEach = function Array$forEach(callback, instance) {
        var length = this.length;
        for (var i = 0; i < length; i++) {
            if (i in this) {
                callback.call(instance, this[i], i, this);
            }
        }
    }
}

Array.prototype.getEnumerator = function Array$getEnumerator() {
    return new ss.ArrayEnumerator(this);
}

Array.prototype.groupBy = function Array$groupBy(callback, instance) {
    var length = this.length;
    var groups = [];
    var keys = {};
    for (var i = 0; i < length; i++) {
        if (i in this) {
            var key = callback.call(instance, this[i], i);
            if (String.isNullOrEmpty(key)) {
                continue;
            }
            var items = keys[key];
            if (!items) {
                items = [];
                items.key = key;

                keys[key] = items;
                groups.add(items);
            }
            items.add(this[i]);
        }
    }
    return groups;
}

Array.prototype.index = function Array$index(callback, instance) {
    var length = this.length;
    var items = {};
    for (var i = 0; i < length; i++) {
        if (i in this) {
            var key = callback.call(instance, this[i], i);
            if (String.isNullOrEmpty(key)) {
                continue;
            }
            items[key] = this[i];
        }
    }
    return items;
}

if (!Array.prototype.indexOf) {
    Array.prototype.indexOf = function Array$indexOf(item, startIndex) {
        startIndex = startIndex || 0;
        var length = this.length;
        if (length) {
            for (var index = startIndex; index < length; index++) {
                if (this[index] === item) {
                    return index;
                }
            }
        }
        return -1;
    }
}

Array.prototype.insert = function Array$insert(index, item) {
    this.splice(index, 0, item);
}

Array.prototype.insertRange = function Array$insertRange(index, items) {
    if (index === 0) {
        this.unshift.apply(this, items);
    }
    else {
        for (var i = 0; i < items.length; i++) {
            this.splice(index + i, 0, items[i]);
        }
    }
}

if (!Array.prototype.map) {
    Array.prototype.map = function Array$map(callback, instance) {
        var length = this.length;
        var mapped = new Array(length);
        for (var i = 0; i < length; i++) {
            if (i in this) {
                mapped[i] = callback.call(instance, this[i], i, this);
            }
        }
        return mapped;
    }
}

Array.parse = function Array$parse(s) {
    return eval('(' + s + ')');
}

Array.prototype.remove = function Array$remove(item) {
    var index = this.indexOf(item);
    if (index >= 0) {
        this.splice(index, 1);
        return true;
    }
    return false;
}

Array.prototype.removeAt = function Array$removeAt(index) {
    this.splice(index, 1);
}

Array.prototype.removeRange = function Array$removeRange(index, count) {
    return this.splice(index, count);
}

if (!Array.prototype.some) {
    Array.prototype.some = function Array$some(callback, instance) {
        var length = this.length;
        for (var i = 0; i < length; i++) {
            if (i in this && callback.call(instance, this[i], i, this)) {
                return true;
            }
        }
        return false;
    }
}

Array.toArray = function Array$toArray(obj) {
    return Array.prototype.slice.call(obj);
}

///////////////////////////////////////////////////////////////////////////////
// RegExp Extensions

RegExp.__typeName = 'RegExp';

RegExp.parse = function RegExp$parse(s) {
    if (s.startsWith('/')) {
        var endSlashIndex = s.lastIndexOf('/');
        if (endSlashIndex > 1) {
            var expression = s.substring(1, endSlashIndex);
            var flags = s.substr(endSlashIndex + 1);
            return new RegExp(expression, flags);
        }
    }

    return null;    
}

///////////////////////////////////////////////////////////////////////////////
// Date Extensions

Date.__typeName = 'Date';

Date.empty = null;

Date.get_now = function Date$get_now() {
    return new Date();
}

Date.get_today = function Date$get_today() {
    var d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

Date.isEmpty = function Date$isEmpty(d) {
    return (d === null) || (d.valueOf() === 0);
}

Date.prototype.format = function Date$format(format) {
    if (ss.isNullOrUndefined(format) || (format.length == 0) || (format == 'i')) {
        return this.toString();
    }
    if (format == 'id') {
        return this.toDateString();
    }
    if (format == 'it') {
        return this.toTimeString();
    }

    return this._netFormat(format, false);
}

Date.prototype.localFormat = function Date$localeFormat(format) {
    if (ss.isNullOrUndefined(format) || (format.length == 0) || (format == 'i')) {
        return this.toLocaleString();
    }
    if (format == 'id') {
        return this.toLocaleDateString();
    }
    if (format == 'it') {
        return this.toLocaleTimeString();
    }

    return this._netFormat(format, true);
}

Date.prototype._netFormat = function Date$_netFormat(format, useLocale) {
    var dtf = useLocale ? ss.CultureInfo.CurrentCulture.dateFormat : ss.CultureInfo.InvariantCulture.dateFormat;
    var useUTC = false;

    if (format.length == 1) {
        switch (format) {
            case 'f': format = dtf.longDatePattern + ' ' + dtf.shortTimePattern;
            case 'F': format = dtf.dateTimePattern; break;

            case 'd': format = dtf.shortDatePattern; break;
            case 'D': format = dtf.longDatePattern; break;

            case 't': format = dtf.shortTimePattern; break;
            case 'T': format = dtf.longTimePattern; break;

            case 'g': format = dtf.shortDatePattern + ' ' + dtf.shortTimePattern; break;
            case 'G': format = dtf.shortDatePattern + ' ' + dtf.longTimePattern; break;

            case 'R': case 'r': format = dtf.gmtDateTimePattern; useUTC = true; break;
            case 'u': format = dtf.universalDateTimePattern; useUTC = true; break;
            case 'U': format = dtf.dateTimePattern; useUTC = true; break;

            case 's': format = dtf.sortableDateTimePattern; break;
        }
    }

    if (format.charAt(0) == '%') {
        format = format.substr(1);
    }

    if (!Date._formatRE) {
        Date._formatRE = /dddd|ddd|dd|d|MMMM|MMM|MM|M|yyyy|yy|y|hh|h|HH|H|mm|m|ss|s|tt|t|fff|ff|f|zzz|zz|z/g;
    }

    var re = Date._formatRE;    
    var sb = new ss.StringBuilder();
    var dt = this;
    if (useUTC) {
        dt = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate(),
                               dt.getUTCHours(), dt.getUTCMinutes(), dt.getUTCSeconds(), dt.getUTCMilliseconds()));
    }

    re.lastIndex = 0;
    while (true) {
        var index = re.lastIndex;
        var match = re.exec(format);

        sb.append(format.slice(index, match ? match.index : format.length));
        if (!match) {
            break;
        }

        var fs = match[0];
        var part = fs;
        switch (fs) {
            case 'dddd':
                part = dtf.dayNames[dt.getDay()];
                break;
            case 'ddd':
                part = dtf.shortDayNames[dt.getDay()];
                break;
            case 'dd':
                part = dt.getDate().toString().padLeft(2, '0');
                break;
            case 'd':
                part = dt.getDate();
                break;
            case 'MMMM':
                part = dtf.monthNames[dt.getMonth()];
                break;
            case 'MMM':
                part = dtf.shortMonthNames[dt.getMonth()];
                break;
            case 'MM':
                part = (dt.getMonth() + 1).toString().padLeft(2, '0');
                break;
            case 'M':
                part = (dt.getMonth() + 1);
                break;
            case 'yyyy':
                part = dt.getFullYear();
                break;
            case 'yy':
                part = (dt.getFullYear() % 100).toString().padLeft(2, '0');
                break;
            case 'y':
                part = (dt.getFullYear() % 100);
                break;
            case 'h': case 'hh':
                part = dt.getHours() % 12;
                if (!part) {
                    part = '12';
                }
                else if (fs == 'hh') {
                    part = part.toString().padLeft(2, '0');
                }
                break;
            case 'HH':
                part = dt.getHours().toString().padLeft(2, '0');
                break;
            case 'H':
                part = dt.getHours();
                break;
            case 'mm':
                part = dt.getMinutes().toString().padLeft(2, '0');
                break;
            case 'm':
                part = dt.getMinutes();
                break;
            case 'ss':
                part = dt.getSeconds().toString().padLeft(2, '0');
                break;
            case 's':
                part = dt.getSeconds();
                break;
            case 't': case 'tt':
                part = (dt.getHours() < 12) ? dtf.amDesignator : dtf.pmDesignator;
                if (fs == 't') {
                    part = part.charAt(0);
                }
                break;
            case 'fff':
                part = dt.getMilliseconds().toString().padLeft(3, '0');
                break;
            case 'ff':
                part = dt.getMilliseconds().toString().padLeft(3).substr(0, 2);
                break;
            case 'f':
                part = dt.getMilliseconds().toString().padLeft(3).charAt(0);
                break;
            case 'z':
                part = dt.getTimezoneOffset() / 60;
                part = ((part >= 0) ? '-' : '+') + Math.floor(Math.abs(part));
                break;
            case 'zz': case 'zzz':
                part = dt.getTimezoneOffset() / 60;
                part = ((part >= 0) ? '-' : '+') + Math.floor(Math.abs(part)).toString().padLeft(2, '0');
                if (fs == 'zzz') {
                    part += dtf.timeSeparator + Math.abs(dt.getTimezoneOffset() % 60).toString().padLeft(2, '0');
                }
                break;
        }
        sb.append(part);
    }

    return sb.toString();
}

Date.parseDate = function Date$parse(s) {
    // Date.parse returns the number of milliseconds
    // so we use that to create an actual Date instance
    return new Date(Date.parse(s));
}

///////////////////////////////////////////////////////////////////////////////
// Error Extensions

Error.__typeName = 'Error';

Error.prototype.popStackFrame = function Error$popStackFrame() {
    if (ss.isNullOrUndefined(this.stack) ||
        ss.isNullOrUndefined(this.fileName) ||
        ss.isNullOfUndefined(this.lineNumber)) {
        return;
    }

    var stackFrames = this.stack.split('\n');
    var currentFrame = stackFrames[0];
    var pattern = this.fileName + ':' + this.lineNumber;
    while (!ss.isNullOrUndefined(currentFrame) &&
           currentFrame.indexOf(pattern) === -1) {
        stackFrames.shift();
        currentFrame = stackFrames[0];
    }

    var nextFrame = stackFrames[1];
    if (isNullOrUndefined(nextFrame)) {
        return;
    }

    var nextFrameParts = nextFrame.match(/@(.*):(\d+)$/);
    if (ss.isNullOrUndefined(nextFrameParts)) {
        return;
    }

    stackFrames.shift();
    this.stack = stackFrames.join("\n");
    this.fileName = nextFrameParts[1];
    this.lineNumber = parseInt(nextFrameParts[2]);
}

Error.createError = function Error$createError(message, errorInfo, innerException) {
    var e = new Error(message);
    if (errorInfo) {
        for (var v in errorInfo) {
            e[v] = errorInfo[v];
        }
    }
    if (innerException) {
        e.innerException = innerException;
    }

    e.popStackFrame();
    return e;
}

///////////////////////////////////////////////////////////////////////////////
// Debug Extensions

ss.Debug = window.Debug ? window.Debug : function() { };
ss.Debug.__typeName = 'Debug';

if (!ss.Debug.writeln) {
    ss.Debug.writeln = function Debug$writeln(text) {
        if (window.console) {
            if (window.console.debug) {
                window.console.debug(text);
                return;
            }
            else if (window.console.log) {
                window.console.log(text);
                return;
            }
        }
        else if (window.opera &&
            window.opera.postError) {
            window.opera.postError(text);
            return;
        }
    }
}

ss.Debug._fail = function Debug$_fail(message) {
    ss.Debug.writeln(message);
    eval('debugger;');
}

ss.Debug.assert = function Debug$assert(condition, message) {
    if (!condition) {
        message = 'Assert failed: ' + message;
        if (confirm(message + '\r\n\r\nBreak into debugger?')) {
            ss.Debug._fail(message);
        }
    }
}

ss.Debug.fail = function Debug$fail(message) {
    ss.Debug._fail(message);
}

ss.Debug._traceDump = function Debug$_traceDump(sb, object, name, indentation, dumpedObjects) {
    if (object === null) {
        sb.appendLine(indentation + name + ': null');
        return;
    }
    switch (typeof(object)) {
        case 'undefined':
            sb.appendLine(indentation + name + ': undefined');
            break;
        case 'number':
        case 'string':
        case 'boolean':
            sb.appendLine(indentation + name + ': ' + object);
            break;
        default:
            if (Date.isInstanceOfType(object) || RegExp.isInstanceOfType(object)) {
                sb.appendLine(indentation + name + ': ' + object);
                break;
            }

            if (dumpedObjects.contains(object)) {
                sb.appendLine(indentation + name + ': ...');
                break;
            }
            dumpedObjects.add(object);

            var type = Type.getInstanceType(object);
            var typeName = type.get_fullName();
            var recursiveIndentation = indentation + '  ';

            if (Array.isInstanceOfType(object)) {
                sb.appendLine(indentation + name + ': {' + typeName + '}');
                var length = object.length;
                for (var i = 0; i < length; i++) {
                    ss.Debug._traceDump(sb, object[i], '[' + i + ']', recursiveIndentation, dumpedObjects);
                }
            }
            else {
                if (object.tagName) {
                    sb.appendLine(indentation + name + ': <' + object.tagName + '>');
                    var attributes = object.attributes;
                    for (var i = 0; i < attributes.length; i++) {
                        var attrValue = attributes[i].nodeValue;
                        if (attrValue) {
                            ss.Debug._traceDump(sb, attrValue, attributes[i].nodeName, recursiveIndentation, dumpedObjects);
                        }
                    }
                }
                else {
                    sb.appendLine(indentation + name + ': {' + typeName + '}');
                    for (var field in object) {
                        var v = object[field];
                        if (!Function.isInstanceOfType(v)) {
                            ss.Debug._traceDump(sb, v, field, recursiveIndentation, dumpedObjects);
                        }
                    }
                }
            }

            dumpedObjects.remove(object);
            break;
    }
}

ss.Debug.traceDump = function Debug$traceDump(object, name) {
    if ((!name || !name.length) && (object !== null)) {
        name = Type.getInstanceType(object).get_fullName();
    }

    var sb = new ss.StringBuilder();
    ss.Debug._traceDump(sb, object, name, '', []);
    ss.Debug.writeLine(sb.toString());
}

ss.Debug.writeLine = function Debug$writeLine(message) {
    if (window.debugService) {
        window.debugService.trace(message);
        return;
    }
    ss.Debug.writeln(message);

    var traceTextBox = document.getElementById('_traceTextBox');
    if (traceTextBox) {
        traceTextBox.value = traceTextBox.value + '\r\n' + message;
    }
}

///////////////////////////////////////////////////////////////////////////////
// Type System Implementation

window.Type = Function;
Type.__typeName = 'Type';

window.__Namespace = function(name) {
    this.__typeName = name;
}
__Namespace.prototype = {
    __namespace: true,
    getName: function() {
        return this.__typeName;
    }
}

Type.registerNamespace = function Type$registerNamespace(name) {
    if (!window.__namespaces) {
        window.__namespaces = {};
    }
    if (!window.__rootNamespaces) {
        window.__rootNamespaces = [];
    }

    if (window.__namespaces[name]) {
        return;
    }

    var ns = window;
    var nameParts = name.split('.');

    for (var i = 0; i < nameParts.length; i++) {
        var part = nameParts[i];
        var nso = ns[part];
        if (!nso) {
            ns[part] = nso = new __Namespace(nameParts.slice(0, i + 1).join('.'));
            if (i == 0) {
                window.__rootNamespaces.add(nso);
            }
        }
        ns = nso;
    }

    window.__namespaces[name] = ns;
}

Type.prototype.registerClass = function Type$registerClass(name, baseType, interfaceType) {
    this.prototype.constructor = this;
    this.__typeName = name;
    this.__class = true;
    this.__baseType = baseType || Object;
    if (baseType) {
        this.__basePrototypePending = true;
    }

    if (interfaceType) {
        this.__interfaces = [];
        for (var i = 2; i < arguments.length; i++) {
            interfaceType = arguments[i];
            this.__interfaces.add(interfaceType);
        }
    }
}

Type.prototype.registerInterface = function Type$createInterface(name) {
    this.__typeName = name;
    this.__interface = true;
}

Type.prototype.registerEnum = function Type$createEnum(name, flags) {
    for (var field in this.prototype) {
         this[field] = this.prototype[field];
    }

    this.__typeName = name;
    this.__enum = true;
    if (flags) {
        this.__flags = true;
    }
    
    this.toString = ss.Enum._enumToString;
}

Type.prototype.setupBase = function Type$setupBase() {
    if (this.__basePrototypePending) {
        var baseType = this.__baseType;
        if (baseType.__basePrototypePending) {
            baseType.setupBase();
        }

        for (var memberName in baseType.prototype) {
            var memberValue = baseType.prototype[memberName];
            if (!this.prototype[memberName]) {
                this.prototype[memberName] = memberValue;
            }
        }

        delete this.__basePrototypePending;
    }
}

if (!Type.prototype.resolveInheritance) {
    // This function is not used by Script#; Visual Studio relies on it
    // for JavaScript IntelliSense support of derived types.
    Type.prototype.resolveInheritance = Type.prototype.setupBase;
}

Type.prototype.initializeBase = function Type$initializeBase(instance, args) {
    if (this.__basePrototypePending) {
        this.setupBase();
    }

    if (!args) {
        this.__baseType.apply(instance);
    }
    else {
        this.__baseType.apply(instance, args);
    }
}

Type.prototype.callBaseMethod = function Type$callBaseMethod(instance, name, args) {
    var baseMethod = this.__baseType.prototype[name];
    if (!args) {
        return baseMethod.apply(instance);
    }
    else {
        return baseMethod.apply(instance, args);
    }
}

Type.prototype.get_baseType = function Type$get_baseType() {
    return this.__baseType || null;
}

Type.prototype.get_fullName = function Type$get_fullName() {
    return this.__typeName;
}

Type.prototype.get_name = function Type$get_name() {
    var fullName = this.__typeName;
    var nsIndex = fullName.lastIndexOf('.');
    if (nsIndex > 0) {
        return fullName.substr(nsIndex + 1);
    }
    return fullName;
}

Type.prototype.getInterfaces = function Type$getInterfaces() {
    return this.__interfaces;
}

Type.prototype.isInstanceOfType = function Type$isInstanceOfType(instance) {
    if (ss.isNullOrUndefined(instance)) {
        return false;
    }
    if ((this == Object) || (instance instanceof this)) {
        return true;
    }

    var type = Type.getInstanceType(instance);
    return this.isAssignableFrom(type);
}

Type.prototype.isAssignableFrom = function Type$isAssignableFrom(type) {
    if ((this == Object) || (this == type)) {
        return true;
    }
    if (this.__class) {
        var baseType = type.__baseType;
        while (baseType) {
            if (this == baseType) {
                return true;
            }
            baseType = baseType.__baseType;
        }
    }
    else if (this.__interface) {
        var interfaces = type.__interfaces;
        if (interfaces && interfaces.contains(this)) {
            return true;
        }

        var baseType = type.__baseType;
        while (baseType) {
            interfaces = baseType.__interfaces;
            if (interfaces && interfaces.contains(this)) {
                return true;
            }
            baseType = baseType.__baseType;
        }
    }
    return false;
}

Type.isClass = function Type$isClass(type) {
    return (type.__class == true);
}

Type.isEnum = function Type$isEnum(type) {
    return (type.__enum == true);
}

Type.isFlags = function Type$isFlags(type) {
    return ((type.__enum == true) && (type.__flags == true));
}

Type.isInterface = function Type$isInterface(type) {
    return (type.__interface == true);
}

Type.isNamespace = function Type$isNamespace(object) {
    return (object.__namespace == true);
}

Type.canCast = function Type$canCast(instance, type) {
    return type.isInstanceOfType(instance);
}

Type.safeCast = function Type$safeCast(instance, type) {
    if (type.isInstanceOfType(instance)) {
        return instance;
    }
    return null;
}

Type.getInstanceType = function Type$getInstanceType(instance) {
    var ctor = null;

    // NOTE: We have to catch exceptions because the constructor
    //       cannot be looked up on native COM objects
    try {
        ctor = instance.constructor;
    }
    catch (ex) {
    }
    if (!ctor || !ctor.__typeName) {
        ctor = Object;
    }
    return ctor;
}

Type.getType = function Type$getType(typeName) {
    if (!typeName) {
        return null;
    }

    if (!Type.__typeCache) {
        Type.__typeCache = {};
    }

    var type = Type.__typeCache[typeName];
    if (!type) {
        type = eval(typeName);
        Type.__typeCache[typeName] = type;
    }
    return type;
}

Type.parse = function Type$parse(typeName) {
    return Type.getType(typeName);
}

///////////////////////////////////////////////////////////////////////////////
// Enum

ss.Enum = function Enum$() {
}
ss.Enum.registerClass('Enum');

ss.Enum.parse = function Enum$parse(enumType, s) {
    var values = enumType.prototype;
    if (!enumType.__flags) {
        for (var f in values) {
            if (f === s) {
                return values[f];
            }
        }
    }
    else {
        var parts = s.split('|');
        var value = 0;
        var parsed = true;

        for (var i = parts.length - 1; i >= 0; i--) {
            var part = parts[i].trim();
            var found = false;

            for (var f in values) {
                if (f === part) {
                    value |= values[f];
                    found = true;
                    break;
                }
            }
            if (!found) {
                parsed = false;
                break;
            }
        }

        if (parsed) {
            return value;
        }
    }
    throw 'Invalid Enumeration Value';
}

ss.Enum._enumToString = function Enum$toString(value) {
    var values = this.prototype;
    if (!this.__flags || (value === 0)) {
        for (var i in values) {
            if (values[i] === value) {
                return i;
            }
        }
        throw 'Invalid Enumeration Value';
    }
    else {
        var parts = [];
        for (var i in values) {
            if (values[i] & value) {
                if (parts.length) {
                    parts.add(' | ');
                }
                parts.add(i);
            }
        }
        if (!parts.length) {
            throw 'Invalid Enumeration Value';
        }
        return parts.join('');
    }
}

///////////////////////////////////////////////////////////////////////////////
// Delegate

ss.Delegate = function Delegate$() {
}
ss.Delegate.registerClass('Delegate');

ss.Delegate.Null = function() { }

ss.Delegate._contains = function Delegate$_contains(targets, object, method) {
    for (var i = 0; i < targets.length; i += 2) {
        if (targets[i] === object && targets[i + 1] === method) {
            return true;
        }
    }
    return false;
}

ss.Delegate._create = function Delegate$_create(targets) {
    var delegate = function() {
        if (targets.length == 2) {
            return targets[1].apply(targets[0], arguments);
        }
        else {
            var clone = targets.clone();
            for (var i = 0; i < clone.length; i += 2) {
                if (ss.Delegate._contains(targets, clone[i], clone[i + 1])) {
                    clone[i + 1].apply(clone[i], arguments);
                }
            }
            return null;
        }
    };
    delegate.invoke = delegate;
    delegate._targets = targets;

    return delegate;
}

ss.Delegate.create = function Delegate$create(object, method) {
    if (!object) {
        method.invoke = method;
        return method;
    }
    return ss.Delegate._create([object, method]);
}

ss.Delegate.combine = function Delegate$combine(delegate1, delegate2) {
    if (!delegate1) {
        if (!delegate2._targets) {
            return ss.Delegate.create(null, delegate2);
        }
        return delegate2;
    }
    if (!delegate2) {
        if (!delegate1._targets) {
            return ss.Delegate.create(null, delegate1);
        }
        return delegate1;
    }

    var targets1 = delegate1._targets ? delegate1._targets : [null, delegate1];
    var targets2 = delegate2._targets ? delegate2._targets : [null, delegate2];

    return ss.Delegate._create(targets1.concat(targets2));
}

ss.Delegate.remove = function Delegate$remove(delegate1, delegate2) {
    if (!delegate1 || (delegate1 === delegate2)) {
        return null;
    }
    if (!delegate2) {
        return delegate1;
    }

    var targets = delegate1._targets;
    var object = null;
    var method;
    if (delegate2._targets) {
        object = delegate2._targets[0];
        method = delegate2._targets[1];
    }
    else {
        method = delegate2;
    }

    for (var i = 0; i < targets.length; i += 2) {
        if ((targets[i] === object) && (targets[i + 1] === method)) {
            if (targets.length == 2) {
                return null;
            }
            targets.splice(i, 2);
            return ss.Delegate._create(targets);
        }
    }

    return delegate1;
}

ss.Delegate.createExport = function Delegate$createExport(delegate, multiUse) {
    var name = '__' + (new Date()).valueOf();
    ss.Delegate[name] = function() {
        if (!multiUse) {
            ss.Delegate.deleteExport(name);
        }
        delegate.apply(null, arguments);
    };

    return name;
}

ss.Delegate.deleteExport = function Delegate$deleteExport(name) {
    if (ss.Delegate[name]) {
        delete ss.Delegate[name];
    }
}

ss.Delegate.clearExport = function Delegate$clearExport(name) {
    if (ss.Delegate[name]) {
        ss.Delegate[name] = Delegate.Null;
    }
}

///////////////////////////////////////////////////////////////////////////////
// CultureInfo

ss.CultureInfo = function CultureInfo$(name, numberFormat, dateFormat) {
    this.name = name;
    this.numberFormat = numberFormat;
    this.dateFormat = dateFormat;
}
ss.CultureInfo.registerClass('CultureInfo');

ss.CultureInfo.InvariantCulture = new ss.CultureInfo('en-US',
    {
        naNSymbol: 'NaN',
        negativeSign: '-',
        positiveSign: '+',
        negativeInfinityText: '-Infinity',
        positiveInfinityText: 'Infinity',
        
        percentSymbol: '%',
        percentGroupSizes: [3],
        percentDecimalDigits: 2,
        percentDecimalSeparator: '.',
        percentGroupSeparator: ',',
        percentPositivePattern: '{0} %',
        percentNegativePattern: '-{0} %',

        currencySymbol:'$',
        currencyGroupSizes: [3],
        currencyDecimalDigits: 2,
        currencyDecimalSeparator: '.',
        currencyGroupSeparator: ',',
        currencyNegativePattern: '(${0})',
        currencyPositivePattern: '${0}',

        numberGroupSizes: [3],
        numberDecimalDigits: 2,
        numberDecimalSeparator: '.',
        numberGroupSeparator: ','
    },
    {
        amDesignator: 'AM',
        pmDesignator: 'PM',

        dateSeparator: '/',
        timeSeparator: ':',

        gmtDateTimePattern: 'ddd, dd MMM yyyy HH:mm:ss \'GMT\'',
        universalDateTimePattern: 'yyyy-MM-dd HH:mm:ssZ',
        sortableDateTimePattern: 'yyyy-MM-ddTHH:mm:ss',
        dateTimePattern: 'dddd, MMMM dd, yyyy h:mm:ss tt',

        longDatePattern: 'dddd, MMMM dd, yyyy',
        shortDatePattern: 'M/d/yyyy',

        longTimePattern: 'h:mm:ss tt',
        shortTimePattern: 'h:mm tt',

        firstDayOfWeek: 0,
        dayNames: ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
        shortDayNames: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],
        minimizedDayNames: ['Su','Mo','Tu','We','Th','Fr','Sa'],

        monthNames: ['January','February','March','April','May','June','July','August','September','October','November','December',''],
        shortMonthNames: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','']
    });
ss.CultureInfo.CurrentCulture = ss.CultureInfo.InvariantCulture;

///////////////////////////////////////////////////////////////////////////////
// IEnumerator

ss.IEnumerator = function IEnumerator$() { };
ss.IEnumerator.prototype = {
    get_current: null,
    moveNext: null,
    reset: null
}

ss.IEnumerator.getEnumerator = function ss_IEnumerator$getEnumerator(enumerable) {
    if (enumerable) {
        return enumerable.getEnumerator ? enumerable.getEnumerator() : new ss.ArrayEnumerator(enumerable);
    }
    return null;
}

ss.IEnumerator.registerInterface('IEnumerator');

///////////////////////////////////////////////////////////////////////////////
// IEnumerable

ss.IEnumerable = function IEnumerable$() { };
ss.IEnumerable.prototype = {
    getEnumerator: null
}
ss.IEnumerable.registerInterface('IEnumerable');

///////////////////////////////////////////////////////////////////////////////
// ArrayEnumerator

ss.ArrayEnumerator = function ArrayEnumerator$(array) {
    this._array = array;
    this._index = -1;
}
ss.ArrayEnumerator.prototype = {
    get_current: function ArrayEnumerator$get_current() {
        return this._array[this._index];
    },
    moveNext: function ArrayEnumerator$moveNext() {
        this._index++;
        return (this._index < this._array.length);
    },
    reset: function ArrayEnumerator$reset() {
        this._index = -1;
    }
}

ss.ArrayEnumerator.registerClass('ArrayEnumerator', null, ss.IEnumerator);

///////////////////////////////////////////////////////////////////////////////
// IDisposable

ss.IDisposable = function IDisposable$() { };
ss.IDisposable.prototype = {
    dispose: null
}
ss.IDisposable.registerInterface('IDisposable');

///////////////////////////////////////////////////////////////////////////////
// StringBuilder

ss.StringBuilder = function StringBuilder$(s) {
    this._parts = ss.isNullOrUndefined(s) ? [] : [ s ];
}
ss.StringBuilder.prototype = {
    get_isEmpty: function StringBuilder$get_isEmpty() {
        return (this._parts.length == 0);
    },

    append: function StringBuilder$append(s) {
        if (!ss.isNullOrUndefined(s)) {
            this._parts.add(s);
        }
        return this;
    },

    appendLine: function StringBuilder$appendLine(s) {
        this.append(s);
        this.append('\r\n');
        return this;
    },

    clear: function StringBuilder$clear() {
        this._parts.clear();
    },

    toString: function StringBuilder$toString(s) {
        return this._parts.join(s || '');
    }
};

ss.StringBuilder.registerClass('StringBuilder');

///////////////////////////////////////////////////////////////////////////////
// EventArgs

ss.EventArgs = function EventArgs$() {
}
ss.EventArgs.registerClass('EventArgs');

ss.EventArgs.Empty = new ss.EventArgs();

///////////////////////////////////////////////////////////////////////////////
// XMLHttpRequest

if (!window.XMLHttpRequest) {
    window.XMLHttpRequest = function() {
        var progIDs = [ 'Msxml2.XMLHTTP', 'Microsoft.XMLHTTP' ];

        for (var i = 0; i < progIDs.length; i++) {
            try {
                var xmlHttp = new ActiveXObject(progIDs[i]);
                return xmlHttp;
            }
            catch (ex) {
            }
        }

        return null;
    }
}

///////////////////////////////////////////////////////////////////////////////
// XmlDocumentParser

ss.XmlDocumentParser = function XmlDocumentParser$() {
}
ss.XmlDocumentParser.registerClass('XmlDocumentParser');

ss.XmlDocumentParser.parse = function XmlDocumentParser$parse(markup) {
    if (!window.DOMParser) {
        var progIDs = [ 'Msxml2.DOMDocument.3.0', 'Msxml2.DOMDocument' ];
        
        for (var i = 0; i < progIDs.length; i++) {
            try {
                var xmlDOM = new ActiveXObject(progIDs[i]);
                xmlDOM.async = false;
                xmlDOM.loadXML(markup);
                xmlDOM.setProperty('SelectionLanguage', 'XPath');
                
                return xmlDOM;
            }
            catch (ex) {
            }
        }
    }
    else {
        try {
            var domParser = new DOMParser();
            return domParser.parseFromString(markup, 'text/xml');
        }
        catch (ex) {
        }
    }

    return null;
}

///////////////////////////////////////////////////////////////////////////////
// CancelEventArgs

ss.CancelEventArgs = function CancelEventArgs$() {
    ss.CancelEventArgs.initializeBase(this);
    this._cancel = false;
}
ss.CancelEventArgs.prototype = {
    get_cancel: function ss$CancelEventArgs$get_cancel() {
        return this._cancel;
    },
    set_cancel: function ss$CancelEventArgs$set_cancel(value) {
        this._cancel = value;
    }
}
ss.CancelEventArgs.registerClass('CancelEventArgs', ss.EventArgs);


///////////////////////////////////////////////////////////////////////////////
// INotifyPropertyChanged

ss.INotifyPropertyChanged = function INotifyPropertyChanged$() { };
ss.INotifyPropertyChanged.prototype = {
    add_propertyChanged : null,
    remove_propertyChanged : null
}
ss.INotifyPropertyChanged.registerInterface('INotifyPropertyChanged');

///////////////////////////////////////////////////////////////////////////////
// PropertyChangedEventArgs

ss.PropertyChangedEventArgs = function PropertyChangedEventArgs$(propertyName) {
    ss.PropertyChangedEventArgs.initializeBase(this);
    this._propName = propertyName;
}
ss.PropertyChangedEventArgs.prototype = {
    get_propertyName: function() {
        return this._propName;
    }
}
ss.PropertyChangedEventArgs.registerClass('PropertyChangedEventArgs', ss.EventArgs);

///////////////////////////////////////////////////////////////////////////////
// INotifyCollectionChanged

ss.INotifyCollectionChanged = function INotifyCollectionChanged$() { };
ss.INotifyCollectionChanged.prototype = {
    add_collectionChanged : null,
    remove_collectionChanged : null
}
ss.INotifyCollectionChanged.registerInterface('INotifyCollectionChanged');

///////////////////////////////////////////////////////////////////////////////
// NotifyCollectionChangedAction

ss.CollectionChangedAction = function CollectionChangedAction$() { };
ss.CollectionChangedAction.prototype = {
    add: 0,
    remove: 1,
    reset: 2
}
ss.CollectionChangedAction.registerEnum('CollectionChangedAction', false);

///////////////////////////////////////////////////////////////////////////////
// NotifyCollectionChangedEventArgs

ss.CollectionChangedEventArgs = function CollectionChangedEventArgs$(action, item, index) {
    ss.CollectionChangedEventArgs.initializeBase(this);
    this._action = action;
    this._item = item || null;
    this._index = index || -1;
}
ss.CollectionChangedEventArgs.prototype = {
    get_action: function() {
        return this._action;
    },
    get_index: function() {
        return this._index;
    },
    get_item: function() {
        return this._item;
    }
}
ss.CollectionChangedEventArgs.registerClass('CollectionChangedEventArgs', ss.EventArgs);
