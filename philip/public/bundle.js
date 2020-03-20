
(function(l, i, v, e) { v = l.createElement(i); v.async = 1; v.src = '//' + (location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; e = l.getElementsByTagName(i)[0]; e.parentNode.insertBefore(v, e)})(document, 'script');
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function is_promise(value) {
        return value && typeof value === 'object' && typeof value.then === 'function';
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function validate_store(store, name) {
        if (!store || typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, callback) {
        const unsub = store.subscribe(callback);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_data(text, data) {
        data = '' + data;
        if (text.data !== data)
            text.data = data;
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }
    function createEventDispatcher() {
        const component = current_component;
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function flush() {
        const seen_callbacks = new Set();
        do {
            // first, call beforeUpdate functions
            // and update components
            while (dirty_components.length) {
                const component = dirty_components.shift();
                set_current_component(component);
                update(component.$$);
            }
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    callback();
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
    }
    function update($$) {
        if ($$.fragment) {
            $$.update($$.dirty);
            run_all($$.before_update);
            $$.fragment.p($$.dirty, $$.ctx);
            $$.dirty = null;
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    function handle_promise(promise, info) {
        const token = info.token = {};
        function update(type, index, key, value) {
            if (info.token !== token)
                return;
            info.resolved = key && { [key]: value };
            const child_ctx = assign(assign({}, info.ctx), info.resolved);
            const block = type && (info.current = type)(child_ctx);
            if (info.block) {
                if (info.blocks) {
                    info.blocks.forEach((block, i) => {
                        if (i !== index && block) {
                            group_outros();
                            transition_out(block, 1, 1, () => {
                                info.blocks[i] = null;
                            });
                            check_outros();
                        }
                    });
                }
                else {
                    info.block.d(1);
                }
                block.c();
                transition_in(block, 1);
                block.m(info.mount(), info.anchor);
                flush();
            }
            info.block = block;
            if (info.blocks)
                info.blocks[index] = block;
        }
        if (is_promise(promise)) {
            promise.then(value => {
                update(info.then, 1, info.value, value);
            }, error => {
                update(info.catch, 2, info.error, error);
            });
            // if we previously had a then/catch block, destroy it
            if (info.current !== info.pending) {
                update(info.pending, 0);
                return true;
            }
        }
        else {
            if (info.current !== info.then) {
                update(info.then, 1, info.value, promise);
                return true;
            }
            info.resolved = { [info.value]: promise };
        }
    }

    const globals = (typeof window !== 'undefined' ? window : global);
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        if (component.$$.fragment) {
            run_all(component.$$.on_destroy);
            component.$$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            component.$$.on_destroy = component.$$.fragment = null;
            component.$$.ctx = {};
        }
    }
    function make_dirty(component, key) {
        if (!component.$$.dirty) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty = blank_object();
        }
        component.$$.dirty[key] = true;
    }
    function init(component, options, instance, create_fragment, not_equal, prop_names) {
        const parent_component = current_component;
        set_current_component(component);
        const props = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props: prop_names,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty: null
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, props, (key, value) => {
                if ($$.ctx && not_equal($$.ctx[key], $$.ctx[key] = value)) {
                    if ($$.bound[key])
                        $$.bound[key](value);
                    if (ready)
                        make_dirty(component, key);
                }
            })
            : props;
        $$.update();
        ready = true;
        run_all($$.before_update);
        $$.fragment = create_fragment($$.ctx);
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
    }

    /* src/components/Link.svelte generated by Svelte v3.7.1 */

    const file = "src/components/Link.svelte";

    function create_fragment(ctx) {
    	var li, a, t, dispose;

    	return {
    		c: function create() {
    			li = element("li");
    			a = element("a");
    			t = text(ctx.name);
    			attr(a, "href", ctx.path);
    			attr(a, "class", "svelte-kazhwj");
    			add_location(a, file, 28, 2, 562);
    			add_location(li, file, 27, 0, 555);
    			dispose = listen(a, "click", prevent_default(ctx.redirectTo));
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert(target, li, anchor);
    			append(li, a);
    			append(a, t);
    		},

    		p: function update(changed, ctx) {
    			if (changed.path) {
    				attr(a, "href", ctx.path);
    			}
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(li);
    			}

    			dispose();
    		}
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	let { selectTab, curRoute, routes, path } = $$props;
      let url = window.location.origin + path;
      let name = routes[path].name;

      function redirectTo(event) {
        // change current router path
        selectTab(event.target);
        const path = event.target.pathname;
        curRoute.set(path);

        // push the path into web browser history API
        window.history.pushState({ path }, "", url);
      }

    	const writable_props = ['selectTab', 'curRoute', 'routes', 'path'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Link> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ('selectTab' in $$props) $$invalidate('selectTab', selectTab = $$props.selectTab);
    		if ('curRoute' in $$props) $$invalidate('curRoute', curRoute = $$props.curRoute);
    		if ('routes' in $$props) $$invalidate('routes', routes = $$props.routes);
    		if ('path' in $$props) $$invalidate('path', path = $$props.path);
    	};

    	return {
    		selectTab,
    		curRoute,
    		routes,
    		path,
    		name,
    		redirectTo
    	};
    }

    class Link extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, ["selectTab", "curRoute", "routes", "path"]);

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.selectTab === undefined && !('selectTab' in props)) {
    			console.warn("<Link> was created without expected prop 'selectTab'");
    		}
    		if (ctx.curRoute === undefined && !('curRoute' in props)) {
    			console.warn("<Link> was created without expected prop 'curRoute'");
    		}
    		if (ctx.routes === undefined && !('routes' in props)) {
    			console.warn("<Link> was created without expected prop 'routes'");
    		}
    		if (ctx.path === undefined && !('path' in props)) {
    			console.warn("<Link> was created without expected prop 'path'");
    		}
    	}

    	get selectTab() {
    		throw new Error("<Link>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set selectTab(value) {
    		throw new Error("<Link>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get curRoute() {
    		throw new Error("<Link>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set curRoute(value) {
    		throw new Error("<Link>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get routes() {
    		throw new Error("<Link>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set routes(value) {
    		throw new Error("<Link>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get path() {
    		throw new Error("<Link>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set path(value) {
    		throw new Error("<Link>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/Navigation.svelte generated by Svelte v3.7.1 */

    const file$1 = "src/components/Navigation.svelte";

    // (15:4) {#if pgi == true}
    function create_if_block_1(ctx) {
    	var t, current;

    	var link0 = new Link({
    		props: {
    		curRoute: ctx.curRoute,
    		selectTab: ctx.selectTab,
    		routes: ctx.routes,
    		path: "/local"
    	},
    		$$inline: true
    	});

    	var link1 = new Link({
    		props: {
    		curRoute: ctx.curRoute,
    		selectTab: ctx.selectTab,
    		routes: ctx.routes,
    		path: "/federated"
    	},
    		$$inline: true
    	});

    	return {
    		c: function create() {
    			link0.$$.fragment.c();
    			t = space();
    			link1.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(link0, target, anchor);
    			insert(target, t, anchor);
    			mount_component(link1, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var link0_changes = {};
    			if (changed.curRoute) link0_changes.curRoute = ctx.curRoute;
    			if (changed.selectTab) link0_changes.selectTab = ctx.selectTab;
    			if (changed.routes) link0_changes.routes = ctx.routes;
    			link0.$set(link0_changes);

    			var link1_changes = {};
    			if (changed.curRoute) link1_changes.curRoute = ctx.curRoute;
    			if (changed.selectTab) link1_changes.selectTab = ctx.selectTab;
    			if (changed.routes) link1_changes.routes = ctx.routes;
    			link1.$set(link1_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(link0.$$.fragment, local);

    			transition_in(link1.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(link0.$$.fragment, local);
    			transition_out(link1.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(link0, detaching);

    			if (detaching) {
    				detach(t);
    			}

    			destroy_component(link1, detaching);
    		}
    	};
    }

    // (19:4) {#if $session.user}
    function create_if_block(ctx) {
    	var t0, t1, current;

    	var link0 = new Link({
    		props: {
    		curRoute: ctx.curRoute,
    		selectTab: ctx.selectTab,
    		routes: ctx.routes,
    		path: "/inbox"
    	},
    		$$inline: true
    	});

    	var link1 = new Link({
    		props: {
    		curRoute: ctx.curRoute,
    		selectTab: ctx.selectTab,
    		routes: ctx.routes,
    		path: "/create"
    	},
    		$$inline: true
    	});

    	var link2 = new Link({
    		props: {
    		curRoute: ctx.curRoute,
    		selectTab: ctx.selectTab,
    		routes: ctx.routes,
    		path: "/search"
    	},
    		$$inline: true
    	});

    	return {
    		c: function create() {
    			link0.$$.fragment.c();
    			t0 = space();
    			link1.$$.fragment.c();
    			t1 = space();
    			link2.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(link0, target, anchor);
    			insert(target, t0, anchor);
    			mount_component(link1, target, anchor);
    			insert(target, t1, anchor);
    			mount_component(link2, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var link0_changes = {};
    			if (changed.curRoute) link0_changes.curRoute = ctx.curRoute;
    			if (changed.selectTab) link0_changes.selectTab = ctx.selectTab;
    			if (changed.routes) link0_changes.routes = ctx.routes;
    			link0.$set(link0_changes);

    			var link1_changes = {};
    			if (changed.curRoute) link1_changes.curRoute = ctx.curRoute;
    			if (changed.selectTab) link1_changes.selectTab = ctx.selectTab;
    			if (changed.routes) link1_changes.routes = ctx.routes;
    			link1.$set(link1_changes);

    			var link2_changes = {};
    			if (changed.curRoute) link2_changes.curRoute = ctx.curRoute;
    			if (changed.selectTab) link2_changes.selectTab = ctx.selectTab;
    			if (changed.routes) link2_changes.routes = ctx.routes;
    			link2.$set(link2_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(link0.$$.fragment, local);

    			transition_in(link1.$$.fragment, local);

    			transition_in(link2.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(link0.$$.fragment, local);
    			transition_out(link1.$$.fragment, local);
    			transition_out(link2.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(link0, detaching);

    			if (detaching) {
    				detach(t0);
    			}

    			destroy_component(link1, detaching);

    			if (detaching) {
    				detach(t1);
    			}

    			destroy_component(link2, detaching);
    		}
    	};
    }

    function create_fragment$1(ctx) {
    	var header, ul, t0, t1, t2, current;

    	var if_block0 = (ctx.pgi == true) && create_if_block_1(ctx);

    	var if_block1 = (ctx.$session.user) && create_if_block(ctx);

    	var link0 = new Link({
    		props: {
    		curRoute: ctx.curRoute,
    		selectTab: ctx.selectTab,
    		routes: ctx.routes,
    		path: "/profile"
    	},
    		$$inline: true
    	});

    	var link1 = new Link({
    		props: {
    		curRoute: ctx.curRoute,
    		selectTab: ctx.selectTab,
    		routes: ctx.routes,
    		path: "/about"
    	},
    		$$inline: true
    	});

    	return {
    		c: function create() {
    			header = element("header");
    			ul = element("ul");
    			if (if_block0) if_block0.c();
    			t0 = space();
    			if (if_block1) if_block1.c();
    			t1 = space();
    			link0.$$.fragment.c();
    			t2 = space();
    			link1.$$.fragment.c();
    			add_location(ul, file$1, 13, 2, 194);
    			attr(header, "id", "navigation");
    			add_location(header, file$1, 12, 0, 167);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert(target, header, anchor);
    			append(header, ul);
    			if (if_block0) if_block0.m(ul, null);
    			append(ul, t0);
    			if (if_block1) if_block1.m(ul, null);
    			append(ul, t1);
    			mount_component(link0, ul, null);
    			append(ul, t2);
    			mount_component(link1, ul, null);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (ctx.pgi == true) {
    				if (if_block0) {
    					if_block0.p(changed, ctx);
    					transition_in(if_block0, 1);
    				} else {
    					if_block0 = create_if_block_1(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(ul, t0);
    				}
    			} else if (if_block0) {
    				group_outros();
    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});
    				check_outros();
    			}

    			if (ctx.$session.user) {
    				if (if_block1) {
    					if_block1.p(changed, ctx);
    					transition_in(if_block1, 1);
    				} else {
    					if_block1 = create_if_block(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(ul, t1);
    				}
    			} else if (if_block1) {
    				group_outros();
    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});
    				check_outros();
    			}

    			var link0_changes = {};
    			if (changed.curRoute) link0_changes.curRoute = ctx.curRoute;
    			if (changed.selectTab) link0_changes.selectTab = ctx.selectTab;
    			if (changed.routes) link0_changes.routes = ctx.routes;
    			link0.$set(link0_changes);

    			var link1_changes = {};
    			if (changed.curRoute) link1_changes.curRoute = ctx.curRoute;
    			if (changed.selectTab) link1_changes.selectTab = ctx.selectTab;
    			if (changed.routes) link1_changes.routes = ctx.routes;
    			link1.$set(link1_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block0);
    			transition_in(if_block1);

    			transition_in(link0.$$.fragment, local);

    			transition_in(link1.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(if_block0);
    			transition_out(if_block1);
    			transition_out(link0.$$.fragment, local);
    			transition_out(link1.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(header);
    			}

    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();

    			destroy_component(link0);

    			destroy_component(link1);
    		}
    	};
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let $session;

    	let { routes, curRoute, selectTab, pgi, session } = $$props; validate_store(session, 'session'); component_subscribe($$self, session, $$value => { $session = $$value; $$invalidate('$session', $session); });

    	const writable_props = ['routes', 'curRoute', 'selectTab', 'pgi', 'session'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Navigation> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ('routes' in $$props) $$invalidate('routes', routes = $$props.routes);
    		if ('curRoute' in $$props) $$invalidate('curRoute', curRoute = $$props.curRoute);
    		if ('selectTab' in $$props) $$invalidate('selectTab', selectTab = $$props.selectTab);
    		if ('pgi' in $$props) $$invalidate('pgi', pgi = $$props.pgi);
    		if ('session' in $$props) $$invalidate('session', session = $$props.session);
    	};

    	return {
    		routes,
    		curRoute,
    		selectTab,
    		pgi,
    		session,
    		$session
    	};
    }

    class Navigation extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, ["routes", "curRoute", "selectTab", "pgi", "session"]);

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.routes === undefined && !('routes' in props)) {
    			console.warn("<Navigation> was created without expected prop 'routes'");
    		}
    		if (ctx.curRoute === undefined && !('curRoute' in props)) {
    			console.warn("<Navigation> was created without expected prop 'curRoute'");
    		}
    		if (ctx.selectTab === undefined && !('selectTab' in props)) {
    			console.warn("<Navigation> was created without expected prop 'selectTab'");
    		}
    		if (ctx.pgi === undefined && !('pgi' in props)) {
    			console.warn("<Navigation> was created without expected prop 'pgi'");
    		}
    		if (ctx.session === undefined && !('session' in props)) {
    			console.warn("<Navigation> was created without expected prop 'session'");
    		}
    	}

    	get routes() {
    		throw new Error("<Navigation>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set routes(value) {
    		throw new Error("<Navigation>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get curRoute() {
    		throw new Error("<Navigation>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set curRoute(value) {
    		throw new Error("<Navigation>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get selectTab() {
    		throw new Error("<Navigation>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set selectTab(value) {
    		throw new Error("<Navigation>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get pgi() {
    		throw new Error("<Navigation>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set pgi(value) {
    		throw new Error("<Navigation>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get session() {
    		throw new Error("<Navigation>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set session(value) {
    		throw new Error("<Navigation>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/Footer.svelte generated by Svelte v3.7.1 */

    const file$2 = "src/components/Footer.svelte";

    function create_fragment$2(ctx) {
    	var hr, t, footer, div, h3;

    	return {
    		c: function create() {
    			hr = element("hr");
    			t = space();
    			footer = element("footer");
    			div = element("div");
    			h3 = element("h3");
    			h3.textContent = "PubGate-Philip";
    			attr(hr, "class", "separator");
    			add_location(hr, file$2, 0, 0, 0);
    			add_location(h3, file$2, 3, 4, 82);
    			attr(div, "class", "left-column");
    			add_location(div, file$2, 2, 2, 52);
    			attr(footer, "class", "content");
    			add_location(footer, file$2, 1, 0, 25);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert(target, hr, anchor);
    			insert(target, t, anchor);
    			insert(target, footer, anchor);
    			append(footer, div);
    			append(div, h3);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(hr);
    				detach(t);
    				detach(footer);
    			}
    		}
    	};
    }

    class Footer extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$2, safe_not_equal, []);
    	}
    }

    function xhr(url, options = {}, accept = "application/activity+json") {
        let defaultOptions = {
            headers: {
                "Accept": accept
            }
        };

        return fetch(url, Object.assign(defaultOptions, options))
            .then(d => d.json())
            .catch((error) => {
                console.log(error);
                console.log('fetching');
                //TODO make auth required to use proxy, check if pgi
                return fetch(base_url + "/proxy", {
                    method: 'POST',
                    body: JSON.stringify({url: url})
                })
                    .then(d => d.json())
                    .catch((error) => {
                        console.log(error);
                    });

            });
    }

    function ensureObject(value) {
        if (typeof value === "string") {
            let fpost;
            fpost = xhr(value);
            return fpost => fpost.object;
        } else {
            return value;
        }
    }

    const getHashTag = name => ({
      name,
      href: "",
      type: "Hashtag",
    });

    const getCreateObject = (content, tag) => ({
      type: "Create",
      object: {
        type: "Note",
        attachment: [],
        tag,
        content,
      },
    });

    /* src/components/Publish.svelte generated by Svelte v3.7.1 */
    const { console: console_1 } = globals;

    const file$3 = "src/components/Publish.svelte";

    function create_fragment$3(ctx) {
    	var form, fieldset, textarea, t0, button, t1, button_disabled_value, dispose;

    	return {
    		c: function create() {
    			form = element("form");
    			fieldset = element("fieldset");
    			textarea = element("textarea");
    			t0 = space();
    			button = element("button");
    			t1 = text("Publish");
    			attr(textarea, "class", "form-control svelte-1fvj4fs");
    			attr(textarea, "placeholder", "Write your text here");
    			add_location(textarea, file$3, 61, 4, 1326);
    			attr(fieldset, "class", "form-group");
    			add_location(fieldset, file$3, 60, 2, 1292);
    			attr(button, "class", "btn btn-sm pull-xs-right btn-info");
    			button.disabled = button_disabled_value = !ctx.content || ctx.inProgress;
    			add_location(button, file$3, 67, 2, 1451);
    			add_location(form, file$3, 58, 0, 1262);

    			dispose = [
    				listen(textarea, "input", ctx.textarea_input_handler),
    				listen(form, "submit", ctx.publish)
    			];
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert(target, form, anchor);
    			append(form, fieldset);
    			append(fieldset, textarea);

    			textarea.value = ctx.content;

    			append(form, t0);
    			append(form, button);
    			append(button, t1);
    		},

    		p: function update(changed, ctx) {
    			if (changed.content) textarea.value = ctx.content;

    			if ((changed.content || changed.inProgress) && button_disabled_value !== (button_disabled_value = !ctx.content || ctx.inProgress)) {
    				button.disabled = button_disabled_value;
    			}
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(form);
    			}

    			run_all(dispose);
    		}
    	};
    }

    const hashTagMatcher = /(^|\W)(#[a-z\d][\w-]*)/gi;

    function instance$2($$self, $$props, $$invalidate) {
    	let $session;

    	let { reply = null, session, curRoute } = $$props; validate_store(session, 'session'); component_subscribe($$self, session, $$value => { $session = $$value; $$invalidate('$session', $session); });

      let inProgress = false;
      let content = "";

      const wrapHashTagsWithLink = text =>
        text.match(hashTagMatcher)
          ? text.replace(hashTagMatcher, '$1<a href="" rel="tag">$2</a>')
          : text;

      const getAllHashTags = text => text.match(hashTagMatcher) || [];

      const publish = async ev => {
        ev.preventDefault();

        $$invalidate('inProgress', inProgress = true);
        let tags = getAllHashTags(content)
          .map(v => v.trim())
          .map(getHashTag);

        const data = wrapHashTagsWithLink(content);

        let ap_object = getCreateObject(data, tags);

        if (reply) {
          ap_object.object.inReplyTo = reply.id;
          ap_object.cc = [reply.attributedTo];
        }

        try {
          const response = await fetch($session.user.outbox, {
            method: "POST",
            body: JSON.stringify(ap_object),
            headers: { Authorization: "Bearer " + $session.token },
          });
          const data = await response.json();
        } catch (e) {
          console.log(e);
        }

        $$invalidate('inProgress', inProgress = false);
        $$invalidate('content', content = "");
      };

    	const writable_props = ['reply', 'session', 'curRoute'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console_1.warn(`<Publish> was created with unknown prop '${key}'`);
    	});

    	function textarea_input_handler() {
    		content = this.value;
    		$$invalidate('content', content);
    	}

    	$$self.$set = $$props => {
    		if ('reply' in $$props) $$invalidate('reply', reply = $$props.reply);
    		if ('session' in $$props) $$invalidate('session', session = $$props.session);
    		if ('curRoute' in $$props) $$invalidate('curRoute', curRoute = $$props.curRoute);
    	};

    	return {
    		reply,
    		session,
    		curRoute,
    		inProgress,
    		content,
    		publish,
    		textarea_input_handler
    	};
    }

    class Publish extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$3, safe_not_equal, ["reply", "session", "curRoute"]);

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.session === undefined && !('session' in props)) {
    			console_1.warn("<Publish> was created without expected prop 'session'");
    		}
    		if (ctx.curRoute === undefined && !('curRoute' in props)) {
    			console_1.warn("<Publish> was created without expected prop 'curRoute'");
    		}
    	}

    	get reply() {
    		throw new Error("<Publish>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set reply(value) {
    		throw new Error("<Publish>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get session() {
    		throw new Error("<Publish>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set session(value) {
    		throw new Error("<Publish>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get curRoute() {
    		throw new Error("<Publish>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set curRoute(value) {
    		throw new Error("<Publish>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/PostContent.svelte generated by Svelte v3.7.1 */

    const file$4 = "src/components/PostContent.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.attachment = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.tag = list[i];
    	return child_ctx;
    }

    // (37:0) {:else}
    function create_else_block_1(ctx) {
    	var a, t;

    	return {
    		c: function create() {
    			a = element("a");
    			t = text(ctx.post);
    			attr(a, "href", ctx.post);
    			add_location(a, file$4, 37, 2, 886);
    		},

    		m: function mount(target, anchor) {
    			insert(target, a, anchor);
    			append(a, t);
    		},

    		p: function update(changed, ctx) {
    			if (changed.post) {
    				set_data(t, ctx.post);
    				attr(a, "href", ctx.post);
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(a);
    			}
    		}
    	};
    }

    // (6:0) {#if post.id}
    function create_if_block$1(ctx) {
    	var div, a0, a0_href_value, t0, a1, t1_value = ctx.post.attributedTo, t1, a1_href_value, t2, span0, t4, span1, t5_value = ctx.post.published.replace('T', ' ').replace('Z', ' '), t5, t6, t7, p, raw_value = ctx.post.content, t8, if_block2_anchor;

    	function select_block_type_1(ctx) {
    		if (ctx.customType) return create_if_block_5;
    		return create_else_block;
    	}

    	var current_block_type = select_block_type_1(ctx);
    	var if_block0 = current_block_type(ctx);

    	var if_block1 = (ctx.post.tag) && create_if_block_3(ctx);

    	var if_block2 = (ctx.post.attachment) && create_if_block_1$1(ctx);

    	return {
    		c: function create() {
    			div = element("div");
    			a0 = element("a");
    			if_block0.c();
    			t0 = text("\n    by user\n    ");
    			a1 = element("a");
    			t1 = text(t1_value);
    			t2 = space();
    			span0 = element("span");
    			span0.textContent = "·";
    			t4 = space();
    			span1 = element("span");
    			t5 = text(t5_value);
    			t6 = space();
    			if (if_block1) if_block1.c();
    			t7 = space();
    			p = element("p");
    			t8 = space();
    			if (if_block2) if_block2.c();
    			if_block2_anchor = empty();
    			attr(a0, "href", a0_href_value = ctx.post.id);
    			add_location(a0, file$4, 8, 4, 115);
    			attr(a1, "href", a1_href_value = ctx.post.attributedTo);
    			add_location(a1, file$4, 12, 4, 217);
    			attr(span0, "class", "metadata-seperator");
    			add_location(span0, file$4, 13, 4, 273);
    			add_location(span1, file$4, 14, 4, 319);
    			attr(div, "class", "metadata");
    			add_location(div, file$4, 6, 2, 87);
    			add_location(p, file$4, 26, 2, 606);
    		},

    		m: function mount(target, anchor) {
    			insert(target, div, anchor);
    			append(div, a0);
    			if_block0.m(a0, null);
    			append(div, t0);
    			append(div, a1);
    			append(a1, t1);
    			append(div, t2);
    			append(div, span0);
    			append(div, t4);
    			append(div, span1);
    			append(span1, t5);
    			insert(target, t6, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert(target, t7, anchor);
    			insert(target, p, anchor);
    			p.innerHTML = raw_value;
    			insert(target, t8, anchor);
    			if (if_block2) if_block2.m(target, anchor);
    			insert(target, if_block2_anchor, anchor);
    		},

    		p: function update(changed, ctx) {
    			if (current_block_type === (current_block_type = select_block_type_1(ctx)) && if_block0) {
    				if_block0.p(changed, ctx);
    			} else {
    				if_block0.d(1);
    				if_block0 = current_block_type(ctx);
    				if (if_block0) {
    					if_block0.c();
    					if_block0.m(a0, null);
    				}
    			}

    			if ((changed.post) && a0_href_value !== (a0_href_value = ctx.post.id)) {
    				attr(a0, "href", a0_href_value);
    			}

    			if ((changed.post) && t1_value !== (t1_value = ctx.post.attributedTo)) {
    				set_data(t1, t1_value);
    			}

    			if ((changed.post) && a1_href_value !== (a1_href_value = ctx.post.attributedTo)) {
    				attr(a1, "href", a1_href_value);
    			}

    			if ((changed.post) && t5_value !== (t5_value = ctx.post.published.replace('T', ' ').replace('Z', ' '))) {
    				set_data(t5, t5_value);
    			}

    			if (ctx.post.tag) {
    				if (if_block1) {
    					if_block1.p(changed, ctx);
    				} else {
    					if_block1 = create_if_block_3(ctx);
    					if_block1.c();
    					if_block1.m(t7.parentNode, t7);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if ((changed.post) && raw_value !== (raw_value = ctx.post.content)) {
    				p.innerHTML = raw_value;
    			}

    			if (ctx.post.attachment) {
    				if (if_block2) {
    					if_block2.p(changed, ctx);
    				} else {
    					if_block2 = create_if_block_1$1(ctx);
    					if_block2.c();
    					if_block2.m(if_block2_anchor.parentNode, if_block2_anchor);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(div);
    			}

    			if_block0.d();

    			if (detaching) {
    				detach(t6);
    			}

    			if (if_block1) if_block1.d(detaching);

    			if (detaching) {
    				detach(t7);
    				detach(p);
    				detach(t8);
    			}

    			if (if_block2) if_block2.d(detaching);

    			if (detaching) {
    				detach(if_block2_anchor);
    			}
    		}
    	};
    }

    // (10:34) {:else}
    function create_else_block(ctx) {
    	var t_value = ctx.post.type, t;

    	return {
    		c: function create() {
    			t = text(t_value);
    		},

    		m: function mount(target, anchor) {
    			insert(target, t, anchor);
    		},

    		p: function update(changed, ctx) {
    			if ((changed.post) && t_value !== (t_value = ctx.post.type)) {
    				set_data(t, t_value);
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(t);
    			}
    		}
    	};
    }

    // (10:6) {#if customType}
    function create_if_block_5(ctx) {
    	var t;

    	return {
    		c: function create() {
    			t = text(ctx.customType);
    		},

    		m: function mount(target, anchor) {
    			insert(target, t, anchor);
    		},

    		p: function update(changed, ctx) {
    			if (changed.customType) {
    				set_data(t, ctx.customType);
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(t);
    			}
    		}
    	};
    }

    // (17:2) {#if post.tag}
    function create_if_block_3(ctx) {
    	var div;

    	var each_value_1 = ctx.post.tag;

    	var each_blocks = [];

    	for (var i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	return {
    		c: function create() {
    			div = element("div");

    			for (var i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}
    			attr(div, "class", "tags");
    			add_location(div, file$4, 17, 4, 415);
    		},

    		m: function mount(target, anchor) {
    			insert(target, div, anchor);

    			for (var i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}
    		},

    		p: function update(changed, ctx) {
    			if (changed.post) {
    				each_value_1 = ctx.post.tag;

    				for (var i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(changed, child_ctx);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}
    				each_blocks.length = each_value_1.length;
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(div);
    			}

    			destroy_each(each_blocks, detaching);
    		}
    	};
    }

    // (20:8) {#if tag.type == 'Hashtag'}
    function create_if_block_4(ctx) {
    	var a, t_value = ctx.tag.name, t, a_href_value;

    	return {
    		c: function create() {
    			a = element("a");
    			t = text(t_value);
    			attr(a, "class", "tag");
    			attr(a, "href", a_href_value = ctx.tag.href);
    			add_location(a, file$4, 20, 10, 510);
    		},

    		m: function mount(target, anchor) {
    			insert(target, a, anchor);
    			append(a, t);
    		},

    		p: function update(changed, ctx) {
    			if ((changed.post) && t_value !== (t_value = ctx.tag.name)) {
    				set_data(t, t_value);
    			}

    			if ((changed.post) && a_href_value !== (a_href_value = ctx.tag.href)) {
    				attr(a, "href", a_href_value);
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(a);
    			}
    		}
    	};
    }

    // (19:6) {#each post.tag as tag}
    function create_each_block_1(ctx) {
    	var if_block_anchor;

    	var if_block = (ctx.tag.type == 'Hashtag') && create_if_block_4(ctx);

    	return {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},

    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    		},

    		p: function update(changed, ctx) {
    			if (ctx.tag.type == 'Hashtag') {
    				if (if_block) {
    					if_block.p(changed, ctx);
    				} else {
    					if_block = create_if_block_4(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},

    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);

    			if (detaching) {
    				detach(if_block_anchor);
    			}
    		}
    	};
    }

    // (30:2) {#if post.attachment}
    function create_if_block_1$1(ctx) {
    	var each_1_anchor;

    	var each_value = ctx.post.attachment;

    	var each_blocks = [];

    	for (var i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	return {
    		c: function create() {
    			for (var i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},

    		m: function mount(target, anchor) {
    			for (var i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert(target, each_1_anchor, anchor);
    		},

    		p: function update(changed, ctx) {
    			if (changed.post) {
    				each_value = ctx.post.attachment;

    				for (var i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(changed, child_ctx);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}
    				each_blocks.length = each_value.length;
    			}
    		},

    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);

    			if (detaching) {
    				detach(each_1_anchor);
    			}
    		}
    	};
    }

    // (32:6) {#if attachment.type === 'Document' && attachment.mediaType.startsWith('image')}
    function create_if_block_2(ctx) {
    	var img, img_src_value;

    	return {
    		c: function create() {
    			img = element("img");
    			attr(img, "src", img_src_value = ctx.attachment.url);
    			attr(img, "alt", "image");
    			add_location(img, file$4, 32, 8, 803);
    		},

    		m: function mount(target, anchor) {
    			insert(target, img, anchor);
    		},

    		p: function update(changed, ctx) {
    			if ((changed.post) && img_src_value !== (img_src_value = ctx.attachment.url)) {
    				attr(img, "src", img_src_value);
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(img);
    			}
    		}
    	};
    }

    // (31:4) {#each post.attachment as attachment}
    function create_each_block(ctx) {
    	var if_block_anchor;

    	var if_block = (ctx.attachment.type === 'Document' && ctx.attachment.mediaType.startsWith('image')) && create_if_block_2(ctx);

    	return {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},

    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    		},

    		p: function update(changed, ctx) {
    			if (ctx.attachment.type === 'Document' && ctx.attachment.mediaType.startsWith('image')) {
    				if (if_block) {
    					if_block.p(changed, ctx);
    				} else {
    					if_block = create_if_block_2(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},

    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);

    			if (detaching) {
    				detach(if_block_anchor);
    			}
    		}
    	};
    }

    function create_fragment$4(ctx) {
    	var if_block_anchor;

    	function select_block_type(ctx) {
    		if (ctx.post.id) return create_if_block$1;
    		return create_else_block_1;
    	}

    	var current_block_type = select_block_type(ctx);
    	var if_block = current_block_type(ctx);

    	return {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    		},

    		p: function update(changed, ctx) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(changed, ctx);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);
    				if (if_block) {
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			}
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if_block.d(detaching);

    			if (detaching) {
    				detach(if_block_anchor);
    			}
    		}
    	};
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { post, customType = null } = $$props;

    	const writable_props = ['post', 'customType'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<PostContent> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ('post' in $$props) $$invalidate('post', post = $$props.post);
    		if ('customType' in $$props) $$invalidate('customType', customType = $$props.customType);
    	};

    	return { post, customType };
    }

    class PostContent extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$4, safe_not_equal, ["post", "customType"]);

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.post === undefined && !('post' in props)) {
    			console.warn("<PostContent> was created without expected prop 'post'");
    		}
    	}

    	get post() {
    		throw new Error("<PostContent>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set post(value) {
    		throw new Error("<PostContent>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get customType() {
    		throw new Error("<PostContent>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set customType(value) {
    		throw new Error("<PostContent>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/Post.svelte generated by Svelte v3.7.1 */

    const file$5 = "src/components/Post.svelte";

    // (145:0) {#if isReply == true}
    function create_if_block_4$1(ctx) {
    	var div, current_block_type_index, if_block, current;

    	var if_block_creators = [
    		create_if_block_5$1,
    		create_else_block$1
    	];

    	var if_blocks = [];

    	function select_block_type(ctx) {
    		if (typeof ctx.inReply === 'object' && typeof ctx.inReply.id != 'string') return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	return {
    		c: function create() {
    			div = element("div");
    			if_block.c();
    			attr(div, "class", "reaction svelte-ni4kye");
    			add_location(div, file$5, 145, 2, 2746);
    		},

    		m: function mount(target, anchor) {
    			insert(target, div, anchor);
    			if_blocks[current_block_type_index].m(div, null);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);
    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(changed, ctx);
    			} else {
    				group_outros();
    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});
    				check_outros();

    				if_block = if_blocks[current_block_type_index];
    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}
    				transition_in(if_block, 1);
    				if_block.m(div, null);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(div);
    			}

    			if_blocks[current_block_type_index].d();
    		}
    	};
    }

    // (151:4) {:else}
    function create_else_block$1(ctx) {
    	var current;

    	var postcontent = new PostContent({
    		props: { post: ctx.inReply },
    		$$inline: true
    	});

    	return {
    		c: function create() {
    			postcontent.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(postcontent, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var postcontent_changes = {};
    			if (changed.inReply) postcontent_changes.post = ctx.inReply;
    			postcontent.$set(postcontent_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(postcontent.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(postcontent.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(postcontent, detaching);
    		}
    	};
    }

    // (147:4) {#if typeof inReply === 'object' && typeof inReply.id != 'string'}
    function create_if_block_5$1(ctx) {
    	var await_block_anchor, promise, current;

    	let info = {
    		ctx,
    		current: null,
    		token: null,
    		pending: create_pending_block,
    		then: create_then_block,
    		catch: create_catch_block,
    		value: 'value',
    		error: 'null',
    		blocks: [,,,]
    	};

    	handle_promise(promise = ctx.inReply, info);

    	return {
    		c: function create() {
    			await_block_anchor = empty();

    			info.block.c();
    		},

    		m: function mount(target, anchor) {
    			insert(target, await_block_anchor, anchor);

    			info.block.m(target, info.anchor = anchor);
    			info.mount = () => await_block_anchor.parentNode;
    			info.anchor = await_block_anchor;

    			current = true;
    		},

    		p: function update(changed, new_ctx) {
    			ctx = new_ctx;
    			info.ctx = ctx;

    			if (('inReply' in changed) && promise !== (promise = ctx.inReply) && handle_promise(promise, info)) ; else {
    				info.block.p(changed, assign(assign({}, ctx), info.resolved));
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(info.block);
    			current = true;
    		},

    		o: function outro(local) {
    			for (let i = 0; i < 3; i += 1) {
    				const block = info.blocks[i];
    				transition_out(block);
    			}

    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(await_block_anchor);
    			}

    			info.block.d(detaching);
    			info.token = null;
    			info = null;
    		}
    	};
    }

    // (1:0) <script>   export let post;   export let session;    import { ensureObject }
    function create_catch_block(ctx) {
    	return {
    		c: noop,
    		m: noop,
    		p: noop,
    		i: noop,
    		o: noop,
    		d: noop
    	};
    }

    // (148:33)          <PostContent post={value}
    function create_then_block(ctx) {
    	var current;

    	var postcontent = new PostContent({
    		props: { post: ctx.value },
    		$$inline: true
    	});

    	return {
    		c: function create() {
    			postcontent.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(postcontent, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var postcontent_changes = {};
    			if (changed.inReply) postcontent_changes.post = ctx.value;
    			postcontent.$set(postcontent_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(postcontent.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(postcontent.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(postcontent, detaching);
    		}
    	};
    }

    // (1:0) <script>   export let post;   export let session;    import { ensureObject }
    function create_pending_block(ctx) {
    	return {
    		c: noop,
    		m: noop,
    		p: noop,
    		i: noop,
    		o: noop,
    		d: noop
    	};
    }

    // (165:2) {#if $session.user}
    function create_if_block$2(ctx) {
    	var div, button0, t0, t1, button1, t3, button2, t4, t5, if_block2_anchor, current, dispose;

    	var if_block0 = (ctx.liked) && create_if_block_3$1();

    	var if_block1 = (ctx.announced) && create_if_block_2$1();

    	var if_block2 = (ctx.showPublish) && create_if_block_1$2(ctx);

    	return {
    		c: function create() {
    			div = element("div");
    			button0 = element("button");
    			t0 = text("Like");
    			if (if_block0) if_block0.c();
    			t1 = space();
    			button1 = element("button");
    			button1.textContent = "Add comment";
    			t3 = space();
    			button2 = element("button");
    			t4 = text("Announce");
    			if (if_block1) if_block1.c();
    			t5 = space();
    			if (if_block2) if_block2.c();
    			if_block2_anchor = empty();
    			attr(button0, "class", "ra_item svelte-ni4kye");
    			add_location(button0, file$5, 166, 6, 3365);
    			attr(button1, "class", "ra_item svelte-ni4kye");
    			add_location(button1, file$5, 169, 6, 3442);
    			attr(button2, "class", "ra_item svelte-ni4kye");
    			add_location(button2, file$5, 170, 6, 3518);
    			attr(div, "class", "ra svelte-ni4kye");
    			add_location(div, file$5, 165, 4, 3342);

    			dispose = [
    				listen(button1, "click", ctx.togglePublish),
    				listen(button2, "click", ctx.doAnnounce)
    			];
    		},

    		m: function mount(target, anchor) {
    			insert(target, div, anchor);
    			append(div, button0);
    			append(button0, t0);
    			if (if_block0) if_block0.m(button0, null);
    			append(div, t1);
    			append(div, button1);
    			append(div, t3);
    			append(div, button2);
    			append(button2, t4);
    			if (if_block1) if_block1.m(button2, null);
    			insert(target, t5, anchor);
    			if (if_block2) if_block2.m(target, anchor);
    			insert(target, if_block2_anchor, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (ctx.liked) {
    				if (!if_block0) {
    					if_block0 = create_if_block_3$1();
    					if_block0.c();
    					if_block0.m(button0, null);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (ctx.announced) {
    				if (!if_block1) {
    					if_block1 = create_if_block_2$1();
    					if_block1.c();
    					if_block1.m(button2, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (ctx.showPublish) {
    				if (if_block2) {
    					if_block2.p(changed, ctx);
    					transition_in(if_block2, 1);
    				} else {
    					if_block2 = create_if_block_1$2(ctx);
    					if_block2.c();
    					transition_in(if_block2, 1);
    					if_block2.m(if_block2_anchor.parentNode, if_block2_anchor);
    				}
    			} else if (if_block2) {
    				group_outros();
    				transition_out(if_block2, 1, 1, () => {
    					if_block2 = null;
    				});
    				check_outros();
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block2);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(if_block2);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(div);
    			}

    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();

    			if (detaching) {
    				detach(t5);
    			}

    			if (if_block2) if_block2.d(detaching);

    			if (detaching) {
    				detach(if_block2_anchor);
    			}

    			run_all(dispose);
    		}
    	};
    }

    // (168:12) {#if liked}
    function create_if_block_3$1(ctx) {
    	var t;

    	return {
    		c: function create() {
    			t = text("d");
    		},

    		m: function mount(target, anchor) {
    			insert(target, t, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(t);
    			}
    		}
    	};
    }

    // (172:16) {#if announced}
    function create_if_block_2$1(ctx) {
    	var t;

    	return {
    		c: function create() {
    			t = text("d");
    		},

    		m: function mount(target, anchor) {
    			insert(target, t, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(t);
    			}
    		}
    	};
    }

    // (175:4) {#if showPublish}
    function create_if_block_1$2(ctx) {
    	var current;

    	var publish = new Publish({
    		props: {
    		reply: ctx.post,
    		session: ctx.session
    	},
    		$$inline: true
    	});

    	return {
    		c: function create() {
    			publish.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(publish, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var publish_changes = {};
    			if (changed.post) publish_changes.reply = ctx.post;
    			if (changed.session) publish_changes.session = ctx.session;
    			publish.$set(publish_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(publish.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(publish.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(publish, detaching);
    		}
    	};
    }

    function create_fragment$5(ctx) {
    	var t0, t1, div1, div0, span0, t2, t3, t4, span1, t5, t6, t7, span2, t8, t9, t10, current, dispose;

    	var if_block0 = (ctx.isReply == true) && create_if_block_4$1(ctx);

    	var postcontent = new PostContent({
    		props: {
    		post: ctx.post,
    		customType: ctx.customType
    	},
    		$$inline: true
    	});

    	var if_block1 = (ctx.$session.user) && create_if_block$2(ctx);

    	return {
    		c: function create() {
    			if (if_block0) if_block0.c();
    			t0 = space();
    			postcontent.$$.fragment.c();
    			t1 = space();
    			div1 = element("div");
    			div0 = element("div");
    			span0 = element("span");
    			t2 = text(ctx.likes);
    			t3 = text(" likes");
    			t4 = space();
    			span1 = element("span");
    			t5 = text(ctx.comments);
    			t6 = text(" comments");
    			t7 = space();
    			span2 = element("span");
    			t8 = text(ctx.announces);
    			t9 = text(" announces");
    			t10 = space();
    			if (if_block1) if_block1.c();
    			attr(span0, "class", "rs_left svelte-ni4kye");
    			add_location(span0, file$5, 160, 4, 3085);
    			attr(span1, "class", "rs_right svelte-ni4kye");
    			add_location(span1, file$5, 161, 4, 3155);
    			attr(span2, "class", "rs_right svelte-ni4kye");
    			add_location(span2, file$5, 162, 4, 3232);
    			attr(div0, "class", "rs svelte-ni4kye");
    			add_location(div0, file$5, 159, 2, 3064);
    			attr(div1, "class", "reactionz svelte-ni4kye");
    			add_location(div1, file$5, 158, 0, 3038);

    			dispose = [
    				listen(span0, "click", ctx.toggleLists),
    				listen(span1, "click", ctx.toggleLists),
    				listen(span2, "click", ctx.toggleLists)
    			];
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			if (if_block0) if_block0.m(target, anchor);
    			insert(target, t0, anchor);
    			mount_component(postcontent, target, anchor);
    			insert(target, t1, anchor);
    			insert(target, div1, anchor);
    			append(div1, div0);
    			append(div0, span0);
    			append(span0, t2);
    			append(span0, t3);
    			append(div0, t4);
    			append(div0, span1);
    			append(span1, t5);
    			append(span1, t6);
    			append(div0, t7);
    			append(div0, span2);
    			append(span2, t8);
    			append(span2, t9);
    			append(div1, t10);
    			if (if_block1) if_block1.m(div1, null);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (ctx.isReply == true) {
    				if (if_block0) {
    					if_block0.p(changed, ctx);
    					transition_in(if_block0, 1);
    				} else {
    					if_block0 = create_if_block_4$1(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(t0.parentNode, t0);
    				}
    			} else if (if_block0) {
    				group_outros();
    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});
    				check_outros();
    			}

    			var postcontent_changes = {};
    			if (changed.post) postcontent_changes.post = ctx.post;
    			if (changed.customType) postcontent_changes.customType = ctx.customType;
    			postcontent.$set(postcontent_changes);

    			if (!current || changed.likes) {
    				set_data(t2, ctx.likes);
    			}

    			if (!current || changed.comments) {
    				set_data(t5, ctx.comments);
    			}

    			if (!current || changed.announces) {
    				set_data(t8, ctx.announces);
    			}

    			if (ctx.$session.user) {
    				if (if_block1) {
    					if_block1.p(changed, ctx);
    					transition_in(if_block1, 1);
    				} else {
    					if_block1 = create_if_block$2(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(div1, null);
    				}
    			} else if (if_block1) {
    				group_outros();
    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});
    				check_outros();
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block0);

    			transition_in(postcontent.$$.fragment, local);

    			transition_in(if_block1);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(if_block0);
    			transition_out(postcontent.$$.fragment, local);
    			transition_out(if_block1);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (if_block0) if_block0.d(detaching);

    			if (detaching) {
    				detach(t0);
    			}

    			destroy_component(postcontent, detaching);

    			if (detaching) {
    				detach(t1);
    				detach(div1);
    			}

    			if (if_block1) if_block1.d();
    			run_all(dispose);
    		}
    	};
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let $session;

    	let { post, session } = $$props; validate_store(session, 'session'); component_subscribe($$self, session, $$value => { $session = $$value; $$invalidate('$session', $session); });

      let pgi = pubgate_instance;
      let showPublish = false;
      const togglePublish = ev => {
        ev.preventDefault();
        $$invalidate('showPublish', showPublish = !showPublish);
      };

      const toggleLists = ev => {
        ev.preventDefault();
      };

      let liked;
      let announced;
      if ($session.user) {
        if (post.reactions) {
          if (post.reactions.Like) {
            if (post.reactions.Like[$session.user.name]) {
              $$invalidate('liked', liked = true);
            }
          }
        }

        if (post.reactions) {
          if (post.reactions.Announce) {
            if (post.reactions.Announce[$session.user.name]) {
              $$invalidate('announced', announced = true);
            }
          }
        }
      }

      let inReply;
      let isReply = false;

      let likes = "n/a";
      let comments = "n/a";
      let announces = "n/a";

      if (post.inReplyTo) {
        $$invalidate('inReply', inReply = pgi
          ? post.inReplyTo
          : ensureObject(post.inReplyTo));
        $$invalidate('isReply', isReply = true);
      }

      if (post.likes) {
        $$invalidate('likes', likes = post.likes.totalItems);
      }

      if (post.shares) {
        $$invalidate('announces', announces = post.shares.totalItems);
      }

      if (post.replies) {
        $$invalidate('comments', comments = post.replies.totalItems);
      }

      let customType = isReply ? "Reply" : null;

      async function doAnnounce(ev) {
        ev.preventDefault();
        if (!announced) {
          let ap_object = {
            type: "Announce",
            object: post.id,
            cc: [post.attributedTo],
          };
          const response = await fetch($session.user.outbox, {
            method: "POST",
            body: JSON.stringify(ap_object),
            headers: {
              Authorization: "Bearer " + $session.token,
            },
          }).then(d => d.json());
          $$invalidate('announced', announced = true);
        }
      }

    	const writable_props = ['post', 'session'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Post> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ('post' in $$props) $$invalidate('post', post = $$props.post);
    		if ('session' in $$props) $$invalidate('session', session = $$props.session);
    	};

    	return {
    		post,
    		session,
    		showPublish,
    		togglePublish,
    		toggleLists,
    		liked,
    		announced,
    		inReply,
    		isReply,
    		likes,
    		comments,
    		announces,
    		customType,
    		doAnnounce,
    		$session
    	};
    }

    class Post extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$5, safe_not_equal, ["post", "session"]);

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.post === undefined && !('post' in props)) {
    			console.warn("<Post> was created without expected prop 'post'");
    		}
    		if (ctx.session === undefined && !('session' in props)) {
    			console.warn("<Post> was created without expected prop 'session'");
    		}
    	}

    	get post() {
    		throw new Error("<Post>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set post(value) {
    		throw new Error("<Post>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get session() {
    		throw new Error("<Post>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set session(value) {
    		throw new Error("<Post>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/Activity.svelte generated by Svelte v3.7.1 */

    const file$6 = "src/components/Activity.svelte";

    // (29:2) {:else}
    function create_else_block$2(ctx) {
    	var div0, h2, t1, a0, t2_value = ctx.post.type, t2, a0_href_value, t3, a1, t4_value = ctx.post.actor, t4, a1_href_value, t5, span, t7, t8, div1, current;

    	var if_block = (ctx.post.published) && create_if_block_1$3(ctx);

    	var post_1 = new Post({
    		props: { post: ctx.postObject, session: ctx.session },
    		$$inline: true
    	});

    	return {
    		c: function create() {
    			div0 = element("div");
    			h2 = element("h2");
    			h2.textContent = ".";
    			t1 = space();
    			a0 = element("a");
    			t2 = text(t2_value);
    			t3 = text("\n      by user\n      ");
    			a1 = element("a");
    			t4 = text(t4_value);
    			t5 = space();
    			span = element("span");
    			span.textContent = "·";
    			t7 = space();
    			if (if_block) if_block.c();
    			t8 = space();
    			div1 = element("div");
    			post_1.$$.fragment.c();
    			attr(h2, "id", "");
    			add_location(h2, file$6, 30, 6, 586);
    			attr(a0, "href", a0_href_value = ctx.post.id);
    			add_location(a0, file$6, 31, 6, 609);
    			attr(a1, "href", a1_href_value = ctx.post.actor);
    			add_location(a1, file$6, 33, 6, 663);
    			attr(span, "class", "metadata-seperator");
    			add_location(span, file$6, 34, 6, 707);
    			attr(div0, "class", "metadata");
    			add_location(div0, file$6, 29, 4, 557);
    			attr(div1, "class", "reaction svelte-fh8bnq");
    			add_location(div1, file$6, 40, 4, 878);
    		},

    		m: function mount(target, anchor) {
    			insert(target, div0, anchor);
    			append(div0, h2);
    			append(div0, t1);
    			append(div0, a0);
    			append(a0, t2);
    			append(div0, t3);
    			append(div0, a1);
    			append(a1, t4);
    			append(div0, t5);
    			append(div0, span);
    			append(div0, t7);
    			if (if_block) if_block.m(div0, null);
    			insert(target, t8, anchor);
    			insert(target, div1, anchor);
    			mount_component(post_1, div1, null);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if ((!current || changed.post) && t2_value !== (t2_value = ctx.post.type)) {
    				set_data(t2, t2_value);
    			}

    			if ((!current || changed.post) && a0_href_value !== (a0_href_value = ctx.post.id)) {
    				attr(a0, "href", a0_href_value);
    			}

    			if ((!current || changed.post) && t4_value !== (t4_value = ctx.post.actor)) {
    				set_data(t4, t4_value);
    			}

    			if ((!current || changed.post) && a1_href_value !== (a1_href_value = ctx.post.actor)) {
    				attr(a1, "href", a1_href_value);
    			}

    			if (ctx.post.published) {
    				if (if_block) {
    					if_block.p(changed, ctx);
    				} else {
    					if_block = create_if_block_1$3(ctx);
    					if_block.c();
    					if_block.m(div0, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			var post_1_changes = {};
    			if (changed.postObject) post_1_changes.post = ctx.postObject;
    			if (changed.session) post_1_changes.session = ctx.session;
    			post_1.$set(post_1_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(post_1.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(post_1.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(div0);
    			}

    			if (if_block) if_block.d();

    			if (detaching) {
    				detach(t8);
    				detach(div1);
    			}

    			destroy_component(post_1);
    		}
    	};
    }

    // (26:2) {#if isReaction == false}
    function create_if_block$3(ctx) {
    	var h2, t_1, current;

    	var post_1 = new Post({
    		props: { post: ctx.post.object, session: ctx.session },
    		$$inline: true
    	});

    	return {
    		c: function create() {
    			h2 = element("h2");
    			h2.textContent = ".";
    			t_1 = space();
    			post_1.$$.fragment.c();
    			attr(h2, "id", "");
    			add_location(h2, file$6, 26, 4, 484);
    		},

    		m: function mount(target, anchor) {
    			insert(target, h2, anchor);
    			insert(target, t_1, anchor);
    			mount_component(post_1, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var post_1_changes = {};
    			if (changed.post) post_1_changes.post = ctx.post.object;
    			if (changed.session) post_1_changes.session = ctx.session;
    			post_1.$set(post_1_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(post_1.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(post_1.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(h2);
    				detach(t_1);
    			}

    			destroy_component(post_1, detaching);
    		}
    	};
    }

    // (37:6) {#if post.published}
    function create_if_block_1$3(ctx) {
    	var span, t_value = ctx.post.published.replace('T', ' ').replace('Z', ' '), t;

    	return {
    		c: function create() {
    			span = element("span");
    			t = text(t_value);
    			add_location(span, file$6, 37, 8, 785);
    		},

    		m: function mount(target, anchor) {
    			insert(target, span, anchor);
    			append(span, t);
    		},

    		p: function update(changed, ctx) {
    			if ((changed.post) && t_value !== (t_value = ctx.post.published.replace('T', ' ').replace('Z', ' '))) {
    				set_data(t, t_value);
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(span);
    			}
    		}
    	};
    }

    function create_fragment$6(ctx) {
    	var li, current_block_type_index, if_block, current;

    	var if_block_creators = [
    		create_if_block$3,
    		create_else_block$2
    	];

    	var if_blocks = [];

    	function select_block_type(ctx) {
    		if (ctx.isReaction == false) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	return {
    		c: function create() {
    			li = element("li");
    			if_block.c();
    			attr(li, "class", "post");
    			add_location(li, file$6, 24, 0, 434);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert(target, li, anchor);
    			if_blocks[current_block_type_index].m(li, null);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);
    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(changed, ctx);
    			} else {
    				group_outros();
    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});
    				check_outros();

    				if_block = if_blocks[current_block_type_index];
    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}
    				transition_in(if_block, 1);
    				if_block.m(li, null);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(li);
    			}

    			if_blocks[current_block_type_index].d();
    		}
    	};
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { post, session } = $$props;

      let pgi = pubgate_instance;
      let postObject;
      let isReaction = false;

      if (["Announce", "Like"].includes(post.type)) {
         $$invalidate('postObject', postObject = pgi
          ? post.object
          : ensureObject(post.object));
        $$invalidate('isReaction', isReaction = true);
      }

    	const writable_props = ['post', 'session'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Activity> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ('post' in $$props) $$invalidate('post', post = $$props.post);
    		if ('session' in $$props) $$invalidate('session', session = $$props.session);
    	};

    	return { post, session, postObject, isReaction };
    }

    class Activity extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$6, safe_not_equal, ["post", "session"]);

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.post === undefined && !('post' in props)) {
    			console.warn("<Activity> was created without expected prop 'post'");
    		}
    		if (ctx.session === undefined && !('session' in props)) {
    			console.warn("<Activity> was created without expected prop 'session'");
    		}
    	}

    	get post() {
    		throw new Error("<Activity>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set post(value) {
    		throw new Error("<Activity>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get session() {
    		throw new Error("<Activity>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set session(value) {
    		throw new Error("<Activity>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/TimeLine.svelte generated by Svelte v3.7.1 */

    const file$7 = "src/components/TimeLine.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.post = list[i];
    	return child_ctx;
    }

    // (1:0) <script>   export let curRoute;   export let session;   export let outbox_collection = {}
    function create_catch_block$1(ctx) {
    	return {
    		c: noop,
    		m: noop,
    		p: noop,
    		i: noop,
    		o: noop,
    		d: noop
    	};
    }

    // (75:25)    <ul class="post-list">     {#each value as post}
    function create_then_block$1(ctx) {
    	var ul, t0, div, t1, t2, t3, current;

    	var each_value = ctx.value;

    	var each_blocks = [];

    	for (var i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	var if_block0 = (ctx.homeUrl) && create_if_block_3$2(ctx);

    	var if_block1 = (ctx.prevUrl) && create_if_block_2$2(ctx);

    	var if_block2 = (ctx.page) && create_if_block_1$4(ctx);

    	var if_block3 = (ctx.nextUrl) && create_if_block$4(ctx);

    	return {
    		c: function create() {
    			ul = element("ul");

    			for (var i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t0 = space();
    			div = element("div");
    			if (if_block0) if_block0.c();
    			t1 = space();
    			if (if_block1) if_block1.c();
    			t2 = space();
    			if (if_block2) if_block2.c();
    			t3 = space();
    			if (if_block3) if_block3.c();
    			attr(ul, "class", "post-list");
    			add_location(ul, file$7, 75, 2, 2062);
    			attr(div, "class", "navigation svelte-1crpel7");
    			add_location(div, file$7, 81, 2, 2170);
    		},

    		m: function mount(target, anchor) {
    			insert(target, ul, anchor);

    			for (var i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}

    			insert(target, t0, anchor);
    			insert(target, div, anchor);
    			if (if_block0) if_block0.m(div, null);
    			append(div, t1);
    			if (if_block1) if_block1.m(div, null);
    			append(div, t2);
    			if (if_block2) if_block2.m(div, null);
    			append(div, t3);
    			if (if_block3) if_block3.m(div, null);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (changed.posts || changed.session) {
    				each_value = ctx.value;

    				for (var i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(changed, child_ctx);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(ul, null);
    					}
    				}

    				group_outros();
    				for (i = each_value.length; i < each_blocks.length; i += 1) out(i);
    				check_outros();
    			}

    			if (ctx.homeUrl) {
    				if (!if_block0) {
    					if_block0 = create_if_block_3$2(ctx);
    					if_block0.c();
    					if_block0.m(div, t1);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (ctx.prevUrl) {
    				if (!if_block1) {
    					if_block1 = create_if_block_2$2(ctx);
    					if_block1.c();
    					if_block1.m(div, t2);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (ctx.page) {
    				if (if_block2) {
    					if_block2.p(changed, ctx);
    				} else {
    					if_block2 = create_if_block_1$4(ctx);
    					if_block2.c();
    					if_block2.m(div, t3);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}

    			if (ctx.nextUrl) {
    				if (!if_block3) {
    					if_block3 = create_if_block$4(ctx);
    					if_block3.c();
    					if_block3.m(div, null);
    				}
    			} else if (if_block3) {
    				if_block3.d(1);
    				if_block3 = null;
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			for (var i = 0; i < each_value.length; i += 1) transition_in(each_blocks[i]);

    			current = true;
    		},

    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);
    			for (let i = 0; i < each_blocks.length; i += 1) transition_out(each_blocks[i]);

    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(ul);
    			}

    			destroy_each(each_blocks, detaching);

    			if (detaching) {
    				detach(t0);
    				detach(div);
    			}

    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    			if (if_block3) if_block3.d();
    		}
    	};
    }

    // (77:4) {#each value as post}
    function create_each_block$1(ctx) {
    	var current;

    	var activity = new Activity({
    		props: {
    		post: ctx.post,
    		session: ctx.session
    	},
    		$$inline: true
    	});

    	return {
    		c: function create() {
    			activity.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(activity, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var activity_changes = {};
    			if (changed.posts) activity_changes.post = ctx.post;
    			if (changed.session) activity_changes.session = ctx.session;
    			activity.$set(activity_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(activity.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(activity.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(activity, detaching);
    		}
    	};
    }

    // (83:4) {#if homeUrl}
    function create_if_block_3$2(ctx) {
    	var span, dispose;

    	return {
    		c: function create() {
    			span = element("span");
    			span.textContent = "First";
    			add_location(span, file$7, 83, 6, 2219);
    			dispose = listen(span, "click", ctx.click_handler);
    		},

    		m: function mount(target, anchor) {
    			insert(target, span, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(span);
    			}

    			dispose();
    		}
    	};
    }

    // (86:4) {#if prevUrl}
    function create_if_block_2$2(ctx) {
    	var span, dispose;

    	return {
    		c: function create() {
    			span = element("span");
    			span.textContent = "Previous";
    			add_location(span, file$7, 86, 6, 2309);
    			dispose = listen(span, "click", ctx.click_handler_1);
    		},

    		m: function mount(target, anchor) {
    			insert(target, span, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(span);
    			}

    			dispose();
    		}
    	};
    }

    // (89:4) {#if page}
    function create_if_block_1$4(ctx) {
    	var b, t;

    	return {
    		c: function create() {
    			b = element("b");
    			t = text(ctx.page);
    			add_location(b, file$7, 89, 6, 2399);
    		},

    		m: function mount(target, anchor) {
    			insert(target, b, anchor);
    			append(b, t);
    		},

    		p: function update(changed, ctx) {
    			if (changed.page) {
    				set_data(t, ctx.page);
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(b);
    			}
    		}
    	};
    }

    // (92:4) {#if nextUrl}
    function create_if_block$4(ctx) {
    	var span, dispose;

    	return {
    		c: function create() {
    			span = element("span");
    			span.textContent = "Next";
    			add_location(span, file$7, 92, 6, 2447);
    			dispose = listen(span, "click", ctx.click_handler_2);
    		},

    		m: function mount(target, anchor) {
    			insert(target, span, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(span);
    			}

    			dispose();
    		}
    	};
    }

    // (1:0) <script>   export let curRoute;   export let session;   export let outbox_collection = {}
    function create_pending_block$1(ctx) {
    	return {
    		c: noop,
    		m: noop,
    		p: noop,
    		i: noop,
    		o: noop,
    		d: noop
    	};
    }

    function create_fragment$7(ctx) {
    	var await_block_anchor, promise, current;

    	let info = {
    		ctx,
    		current: null,
    		token: null,
    		pending: create_pending_block$1,
    		then: create_then_block$1,
    		catch: create_catch_block$1,
    		value: 'value',
    		error: 'null',
    		blocks: [,,,]
    	};

    	handle_promise(promise = ctx.posts, info);

    	return {
    		c: function create() {
    			await_block_anchor = empty();

    			info.block.c();
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert(target, await_block_anchor, anchor);

    			info.block.m(target, info.anchor = anchor);
    			info.mount = () => await_block_anchor.parentNode;
    			info.anchor = await_block_anchor;

    			current = true;
    		},

    		p: function update(changed, new_ctx) {
    			ctx = new_ctx;
    			info.ctx = ctx;

    			if (('posts' in changed) && promise !== (promise = ctx.posts) && handle_promise(promise, info)) ; else {
    				info.block.p(changed, assign(assign({}, ctx), info.resolved));
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(info.block);
    			current = true;
    		},

    		o: function outro(local) {
    			for (let i = 0; i < 3; i += 1) {
    				const block = info.blocks[i];
    				transition_out(block);
    			}

    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(await_block_anchor);
    			}

    			info.block.d(detaching);
    			info.token = null;
    			info = null;
    		}
    	};
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let $curRoute, $session;

    	let { curRoute } = $$props; validate_store(curRoute, 'curRoute'); component_subscribe($$self, curRoute, $$value => { $curRoute = $$value; $$invalidate('$curRoute', $curRoute); });
      let { session, outbox_collection = {} } = $$props; validate_store(session, 'session'); component_subscribe($$self, session, $$value => { $session = $$value; $$invalidate('$session', $session); });

      let pgi = pubgate_instance;

      const fetchCollection = function(path, session = {}, inbox = false) {
        let headers = {
          Accept: "application/activity+json",
        };
        if (session.user && inbox) {
          headers["Authorization"] = "Bearer " + session.token;
        }
        return fetch(path, { headers })
          .then(d => d.json())
          .then(d => updatePageLinks(d));
      };

      const getTimeline = function(tab, session) {
        switch (tab) {
          case "/local":
            return pgi
              ? fetchCollection(base_url + "/timeline/local?cached=1")
              : [];
          case "/federated":
            return pgi
              ? fetchCollection(base_url + "/timeline/federated?cached=1")
              : [];
          case "/inbox":
            if (!session.user) return [];
            return pgi
              ? fetchCollection(session.user.inbox + "?cached=1", session, true)
              : fetchCollection(session.user.inbox, session);
          case "/profile":
            return pgi
              ? fetchCollection(session.user.outbox + "?cached=1")
              : fetchCollection(session.user.outbox);
          case "/search":
            return outbox_collection.orderedItems;
          default:
            return [];
        }
      };

      // pagination

      let homeUrl, prevUrl, nextUrl, page;

      const selectPage = query => {
        let args = query.split("?");
        let url = args.shift(); // pull out first argument
        if (pgi) args.push("cached=1");
        $$invalidate('posts', posts = fetchCollection(url + "?" + args.join("&"), session));
      };

      const updatePageLinks = d => {
        let pageMatch = /page=(\d+)$/.exec(d.id);
        $$invalidate('page', page = pageMatch ? parseInt(pageMatch[1]) : 1);
        $$invalidate('homeUrl', homeUrl = page > 1 && d.partOf ? d.partOf : null);
        $$invalidate('prevUrl', prevUrl = page > 1 ? `${homeUrl}?page=${page - 1}` : null);
        $$invalidate('nextUrl', nextUrl = d.next);
        return d.first ? d.first.orderedItems : d.orderedItems;
      };

    	const writable_props = ['curRoute', 'session', 'outbox_collection'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<TimeLine> was created with unknown prop '${key}'`);
    	});

    	function click_handler() {
    		return selectPage(homeUrl);
    	}

    	function click_handler_1() {
    		return selectPage(prevUrl);
    	}

    	function click_handler_2() {
    		return selectPage(nextUrl);
    	}

    	$$self.$set = $$props => {
    		if ('curRoute' in $$props) $$invalidate('curRoute', curRoute = $$props.curRoute);
    		if ('session' in $$props) $$invalidate('session', session = $$props.session);
    		if ('outbox_collection' in $$props) $$invalidate('outbox_collection', outbox_collection = $$props.outbox_collection);
    	};

    	let posts;

    	$$self.$$.update = ($$dirty = { $curRoute: 1, $session: 1 }) => {
    		if ($$dirty.$curRoute || $$dirty.$session) { $$invalidate('posts', posts = getTimeline($curRoute, $session)); }
    	};

    	return {
    		curRoute,
    		session,
    		outbox_collection,
    		homeUrl,
    		prevUrl,
    		nextUrl,
    		page,
    		selectPage,
    		posts,
    		click_handler,
    		click_handler_1,
    		click_handler_2
    	};
    }

    class TimeLine extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$7, safe_not_equal, ["curRoute", "session", "outbox_collection"]);

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.curRoute === undefined && !('curRoute' in props)) {
    			console.warn("<TimeLine> was created without expected prop 'curRoute'");
    		}
    		if (ctx.session === undefined && !('session' in props)) {
    			console.warn("<TimeLine> was created without expected prop 'session'");
    		}
    	}

    	get curRoute() {
    		throw new Error("<TimeLine>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set curRoute(value) {
    		throw new Error("<TimeLine>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get session() {
    		throw new Error("<TimeLine>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set session(value) {
    		throw new Error("<TimeLine>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get outbox_collection() {
    		throw new Error("<TimeLine>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set outbox_collection(value) {
    		throw new Error("<TimeLine>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const subscriber_queue = [];
    /**
     * Creates a `Readable` store that allows reading by subscription.
     * @param value initial value
     * @param {StartStopNotifier}start start and stop notifications for subscriptions
     */
    function readable(value, start) {
        return {
            subscribe: writable(value, start).subscribe,
        };
    }
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    /* src/components/Search.svelte generated by Svelte v3.7.1 */
    const { console: console_1$1 } = globals;

    const file$8 = "src/components/Search.svelte";

    // (143:0) {#if profile}
    function create_if_block_1$5(ctx) {
    	var h2, t0_value = ctx.profile.name, t0, t1, button, t2, t3_value = ctx.profile.summary, t3, t4, if_block1_anchor, current, dispose;

    	function select_block_type(ctx) {
    		if (ctx.following) return create_if_block_3$3;
    		return create_else_block$3;
    	}

    	var current_block_type = select_block_type(ctx);
    	var if_block0 = current_block_type(ctx);

    	var if_block1 = (ctx.outbox_collection) && create_if_block_2$3(ctx);

    	return {
    		c: function create() {
    			h2 = element("h2");
    			t0 = text(t0_value);
    			t1 = space();
    			button = element("button");
    			if_block0.c();
    			t2 = space();
    			t3 = text(t3_value);
    			t4 = space();
    			if (if_block1) if_block1.c();
    			if_block1_anchor = empty();
    			attr(button, "class", "btn btn-sm pull-xs-right btn-info");
    			add_location(button, file$8, 145, 4, 4085);
    			add_location(h2, file$8, 143, 2, 4057);
    			dispose = listen(button, "click", ctx.follow);
    		},

    		m: function mount(target, anchor) {
    			insert(target, h2, anchor);
    			append(h2, t0);
    			append(h2, t1);
    			append(h2, button);
    			if_block0.m(button, null);
    			insert(target, t2, anchor);
    			insert(target, t3, anchor);
    			insert(target, t4, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert(target, if_block1_anchor, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if ((!current || changed.profile) && t0_value !== (t0_value = ctx.profile.name)) {
    				set_data(t0, t0_value);
    			}

    			if (current_block_type !== (current_block_type = select_block_type(ctx))) {
    				if_block0.d(1);
    				if_block0 = current_block_type(ctx);
    				if (if_block0) {
    					if_block0.c();
    					if_block0.m(button, null);
    				}
    			}

    			if ((!current || changed.profile) && t3_value !== (t3_value = ctx.profile.summary)) {
    				set_data(t3, t3_value);
    			}

    			if (ctx.outbox_collection) {
    				if (if_block1) {
    					if_block1.p(changed, ctx);
    					transition_in(if_block1, 1);
    				} else {
    					if_block1 = create_if_block_2$3(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(if_block1_anchor.parentNode, if_block1_anchor);
    				}
    			} else if (if_block1) {
    				group_outros();
    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});
    				check_outros();
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block1);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(if_block1);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(h2);
    			}

    			if_block0.d();

    			if (detaching) {
    				detach(t2);
    				detach(t3);
    				detach(t4);
    			}

    			if (if_block1) if_block1.d(detaching);

    			if (detaching) {
    				detach(if_block1_anchor);
    			}

    			dispose();
    		}
    	};
    }

    // (147:29) {:else}
    function create_else_block$3(ctx) {
    	var t;

    	return {
    		c: function create() {
    			t = text("Follow");
    		},

    		m: function mount(target, anchor) {
    			insert(target, t, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(t);
    			}
    		}
    	};
    }

    // (147:6) {#if following}
    function create_if_block_3$3(ctx) {
    	var t;

    	return {
    		c: function create() {
    			t = text("Unfollow");
    		},

    		m: function mount(target, anchor) {
    			insert(target, t, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(t);
    			}
    		}
    	};
    }

    // (151:2) {#if outbox_collection}
    function create_if_block_2$3(ctx) {
    	var current;

    	var timeline = new TimeLine({
    		props: {
    		curRoute: ctx.timelineRoute,
    		session: ctx.session,
    		outbox_collection: ctx.outbox_collection
    	},
    		$$inline: true
    	});

    	return {
    		c: function create() {
    			timeline.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(timeline, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var timeline_changes = {};
    			if (changed.timelineRoute) timeline_changes.curRoute = ctx.timelineRoute;
    			if (changed.session) timeline_changes.session = ctx.session;
    			if (changed.outbox_collection) timeline_changes.outbox_collection = ctx.outbox_collection;
    			timeline.$set(timeline_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(timeline.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(timeline.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(timeline, detaching);
    		}
    	};
    }

    // (156:0) {#if typeof loadedPost === 'object'}
    function create_if_block$5(ctx) {
    	var current;

    	var post = new Post({
    		props: {
    		post: ctx.loadedPost,
    		session: ctx.session
    	},
    		$$inline: true
    	});

    	return {
    		c: function create() {
    			post.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(post, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var post_changes = {};
    			if (changed.loadedPost) post_changes.post = ctx.loadedPost;
    			if (changed.session) post_changes.session = ctx.session;
    			post.$set(post_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(post.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(post.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(post, detaching);
    		}
    	};
    }

    function create_fragment$8(ctx) {
    	var br0, t0, form0, fieldset0, input0, t1, button0, t2, button0_disabled_value, t3, br1, t4, br2, t5, form1, fieldset1, input1, t6, button1, t7, button1_disabled_value, t8, br3, t9, br4, t10, t11, t12, p, t13, current, dispose;

    	var if_block0 = (ctx.profile) && create_if_block_1$5(ctx);

    	var if_block1 = (typeof ctx.loadedPost === 'object') && create_if_block$5(ctx);

    	return {
    		c: function create() {
    			br0 = element("br");
    			t0 = text("\nSearch accounts\n");
    			form0 = element("form");
    			fieldset0 = element("fieldset");
    			input0 = element("input");
    			t1 = space();
    			button0 = element("button");
    			t2 = text("Search user");
    			t3 = space();
    			br1 = element("br");
    			t4 = space();
    			br2 = element("br");
    			t5 = text("\nLoad Post by link\n");
    			form1 = element("form");
    			fieldset1 = element("fieldset");
    			input1 = element("input");
    			t6 = space();
    			button1 = element("button");
    			t7 = text("Load post");
    			t8 = space();
    			br3 = element("br");
    			t9 = space();
    			br4 = element("br");
    			t10 = space();
    			if (if_block0) if_block0.c();
    			t11 = space();
    			if (if_block1) if_block1.c();
    			t12 = space();
    			p = element("p");
    			t13 = text(ctx.error);
    			add_location(br0, file$8, 104, 0, 3231);
    			attr(input0, "class", "form-control form-control-lg");
    			attr(input0, "type", "text");
    			attr(input0, "placeholder", "Search format: username@domain");
    			add_location(input0, file$8, 108, 4, 3331);
    			attr(fieldset0, "class", "form-group");
    			add_location(fieldset0, file$8, 107, 2, 3297);
    			attr(button0, "class", "btn btn-sm pull-xs-right btn-info");
    			attr(button0, "type", "submit");
    			button0.disabled = button0_disabled_value = !ctx.username;
    			add_location(button0, file$8, 114, 2, 3497);
    			add_location(form0, file$8, 106, 0, 3254);
    			add_location(br1, file$8, 121, 0, 3631);
    			add_location(br2, file$8, 122, 0, 3638);
    			attr(input1, "class", "form-control form-control-lg");
    			attr(input1, "type", "text");
    			attr(input1, "placeholder", "Copy a link here");
    			add_location(input1, file$8, 126, 4, 3742);
    			attr(fieldset1, "class", "form-group");
    			add_location(fieldset1, file$8, 125, 2, 3708);
    			attr(button1, "class", "btn btn-sm pull-xs-right btn-info");
    			attr(button1, "type", "submit");
    			button1.disabled = button1_disabled_value = !ctx.postLink;
    			add_location(button1, file$8, 132, 2, 3894);
    			add_location(form1, file$8, 124, 0, 3663);
    			add_location(br3, file$8, 139, 0, 4026);
    			add_location(br4, file$8, 140, 0, 4033);
    			attr(p, "class", "text-danger");
    			add_location(p, file$8, 159, 0, 4440);

    			dispose = [
    				listen(input0, "input", ctx.input0_input_handler),
    				listen(form0, "submit", prevent_default(ctx.search)),
    				listen(input1, "input", ctx.input1_input_handler),
    				listen(form1, "submit", prevent_default(ctx.loadPost))
    			];
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert(target, br0, anchor);
    			insert(target, t0, anchor);
    			insert(target, form0, anchor);
    			append(form0, fieldset0);
    			append(fieldset0, input0);

    			input0.value = ctx.username;

    			append(form0, t1);
    			append(form0, button0);
    			append(button0, t2);
    			insert(target, t3, anchor);
    			insert(target, br1, anchor);
    			insert(target, t4, anchor);
    			insert(target, br2, anchor);
    			insert(target, t5, anchor);
    			insert(target, form1, anchor);
    			append(form1, fieldset1);
    			append(fieldset1, input1);

    			input1.value = ctx.postLink;

    			append(form1, t6);
    			append(form1, button1);
    			append(button1, t7);
    			insert(target, t8, anchor);
    			insert(target, br3, anchor);
    			insert(target, t9, anchor);
    			insert(target, br4, anchor);
    			insert(target, t10, anchor);
    			if (if_block0) if_block0.m(target, anchor);
    			insert(target, t11, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert(target, t12, anchor);
    			insert(target, p, anchor);
    			append(p, t13);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (changed.username && (input0.value !== ctx.username)) input0.value = ctx.username;

    			if ((!current || changed.username) && button0_disabled_value !== (button0_disabled_value = !ctx.username)) {
    				button0.disabled = button0_disabled_value;
    			}

    			if (changed.postLink && (input1.value !== ctx.postLink)) input1.value = ctx.postLink;

    			if ((!current || changed.postLink) && button1_disabled_value !== (button1_disabled_value = !ctx.postLink)) {
    				button1.disabled = button1_disabled_value;
    			}

    			if (ctx.profile) {
    				if (if_block0) {
    					if_block0.p(changed, ctx);
    					transition_in(if_block0, 1);
    				} else {
    					if_block0 = create_if_block_1$5(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(t11.parentNode, t11);
    				}
    			} else if (if_block0) {
    				group_outros();
    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});
    				check_outros();
    			}

    			if (typeof ctx.loadedPost === 'object') {
    				if (if_block1) {
    					if_block1.p(changed, ctx);
    					transition_in(if_block1, 1);
    				} else {
    					if_block1 = create_if_block$5(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(t12.parentNode, t12);
    				}
    			} else if (if_block1) {
    				group_outros();
    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});
    				check_outros();
    			}

    			if (!current || changed.error) {
    				set_data(t13, ctx.error);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block0);
    			transition_in(if_block1);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(if_block0);
    			transition_out(if_block1);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(br0);
    				detach(t0);
    				detach(form0);
    				detach(t3);
    				detach(br1);
    				detach(t4);
    				detach(br2);
    				detach(t5);
    				detach(form1);
    				detach(t8);
    				detach(br3);
    				detach(t9);
    				detach(br4);
    				detach(t10);
    			}

    			if (if_block0) if_block0.d(detaching);

    			if (detaching) {
    				detach(t11);
    			}

    			if (if_block1) if_block1.d(detaching);

    			if (detaching) {
    				detach(t12);
    				detach(p);
    			}

    			run_all(dispose);
    		}
    	};
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let $session;

    	let { session, curRoute } = $$props; validate_store(session, 'session'); component_subscribe($$self, session, $$value => { $session = $$value; $$invalidate('$session', $session); });
      const protocol = base_url.match(/^https/) ? "https" : "http";
      const timelineRoute = readable("/search");

      // search user
      let username = "";
      let profile = null;
      let following = false;
      let outbox_collection = null;

      // search post
      let loadedPost = "";
      let postLink = "";
      let error = "";

      async function search(event) {
        $$invalidate('error', error = "");
        $$invalidate('profile', profile = null);
        $$invalidate('outbox_collection', outbox_collection = null);
        let pair = username.split("@");
        if (pair.length !== 2) {
          var $$result = (error = "Use this format: username@domain"); $$invalidate('error', error); return $$result;
        }
        let profile_url = `${protocol}://${pair[1]}/@${pair[0]}`;

        if (pubgate_instance) {
          console.log("search", profile_url);
          const res = await fetch(base_url + "/proxy", {
            method: "POST",
            body: JSON.stringify({ url: profile_url }),
          }).then(d => d.json());
          if (res.error) {
            var $$result = (error = JSON.stringify(res.error.strerror || res.error)); $$invalidate('error', error); return $$result;
          }
          $$invalidate('profile', profile = res);

          const body = JSON.stringify({ url: profile.outbox });
          const req = { method: "POST", body };
          const resp = await fetch(base_url + "/proxy", req).then(d => d.json());
          if (!resp) {
            var $$result = (error = "Failed to fetch timeline."); $$invalidate('error', error); return $$result;
          }

          $$invalidate('outbox_collection', outbox_collection =
            typeof resp.first === "string"
              ? await fetchTimeline(resp.first)
              : resp.first);
        } else {
          const headers = { Accept: "application/activity+json" };
          const response = await fetch(profile_url, headers).then(d => d.json());
          if (profile.outbox) $$invalidate('outbox_collection', outbox_collection = profile.outbox);
        }
      }

      const fetchTimeline = async url => {
        return await fetch(base_url + "/proxy", {
          method: "POST",
          body: JSON.stringify({ url: res.first }),
        }).then(d => d.json());
      };

      const follow = async event => {
        const type = event.target.innerText;
        const { id, name } = profile; // OPTIMIZE kind of quirky to pull this form parent
        if (!$session.user) $$invalidate('error', error = "You are not logged in.");
        else if (pubgate_instance) {
          const body = JSON.stringify({ type, object: id });
          const headers = { Authorization: "Bearer " + $session.token };
          const outbox = $session.user.outbox;
          const req = { method: "POST", body, headers };
          const res = await fetch(outbox, req).then(d => d.json());
          if (!res) $$invalidate('error', error = `Empty response trying to ${type} ${name}`);
          else if (res.Created === "success")
            $$invalidate('following', following = type === "Follow" ? true : false);
          else if (res.error && res.error.status_code === 409)
            // 409: 'This user is already followed'
            $$invalidate('following', following = true);
          else $$invalidate('error', error = JSON.stringify(res.error || res));
        }
      };

      async function loadPost(event) {
        $$invalidate('error', error = loadedPost = ""); $$invalidate('loadedPost', loadedPost);
        try {
          const response = await xhr(postLink);
          const { type } = response;
          if (type !== "Note") {
            var $$result = (error = `Wrong type: ${type}`); $$invalidate('error', error); return $$result;
          }
          $$invalidate('loadedPost', loadedPost = response);
          $$invalidate('postLink', postLink = "");
        } catch (e) {
          $$invalidate('error', error = e.message);
        }
      }

    	const writable_props = ['session', 'curRoute'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console_1$1.warn(`<Search> was created with unknown prop '${key}'`);
    	});

    	function input0_input_handler() {
    		username = this.value;
    		$$invalidate('username', username);
    	}

    	function input1_input_handler() {
    		postLink = this.value;
    		$$invalidate('postLink', postLink);
    	}

    	$$self.$set = $$props => {
    		if ('session' in $$props) $$invalidate('session', session = $$props.session);
    		if ('curRoute' in $$props) $$invalidate('curRoute', curRoute = $$props.curRoute);
    	};

    	return {
    		session,
    		curRoute,
    		timelineRoute,
    		username,
    		profile,
    		following,
    		outbox_collection,
    		loadedPost,
    		postLink,
    		error,
    		search,
    		follow,
    		loadPost,
    		input0_input_handler,
    		input1_input_handler
    	};
    }

    class Search extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$8, safe_not_equal, ["session", "curRoute"]);

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.session === undefined && !('session' in props)) {
    			console_1$1.warn("<Search> was created without expected prop 'session'");
    		}
    		if (ctx.curRoute === undefined && !('curRoute' in props)) {
    			console_1$1.warn("<Search> was created without expected prop 'curRoute'");
    		}
    	}

    	get session() {
    		throw new Error("<Search>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set session(value) {
    		throw new Error("<Search>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get curRoute() {
    		throw new Error("<Search>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set curRoute(value) {
    		throw new Error("<Search>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/Profile.svelte generated by Svelte v3.7.1 */
    const { console: console_1$2 } = globals;

    const file$9 = "src/components/Profile.svelte";

    // (82:0) {:else}
    function create_else_block$4(ctx) {
    	var div0, t1, form0, fieldset0, input0, t2, fieldset1, input1, t3, button0, t4, button0_disabled_value, t5, br0, t6, div1, t7, t8, br1, t9, br2, t10, form1, fieldset2, input2, t11, fieldset3, input3, t12, fieldset4, textarea, t13, fieldset5, input4, t14, fieldset6, input5, t15, button1, t16, button1_disabled_value, dispose;

    	return {
    		c: function create() {
    			div0 = element("div");
    			div0.textContent = "Sign-in ( ActivityPub compatible, OAuth2 password grant )";
    			t1 = space();
    			form0 = element("form");
    			fieldset0 = element("fieldset");
    			input0 = element("input");
    			t2 = space();
    			fieldset1 = element("fieldset");
    			input1 = element("input");
    			t3 = space();
    			button0 = element("button");
    			t4 = text("Sign in");
    			t5 = space();
    			br0 = element("br");
    			t6 = space();
    			div1 = element("div");
    			t7 = text(ctx.error);
    			t8 = space();
    			br1 = element("br");
    			t9 = text("\n  or register ( PubGate only )\n  ");
    			br2 = element("br");
    			t10 = space();
    			form1 = element("form");
    			fieldset2 = element("fieldset");
    			input2 = element("input");
    			t11 = space();
    			fieldset3 = element("fieldset");
    			input3 = element("input");
    			t12 = space();
    			fieldset4 = element("fieldset");
    			textarea = element("textarea");
    			t13 = space();
    			fieldset5 = element("fieldset");
    			input4 = element("input");
    			t14 = space();
    			fieldset6 = element("fieldset");
    			input5 = element("input");
    			t15 = space();
    			button1 = element("button");
    			t16 = text("Register");
    			attr(div0, "class", "form-group");
    			add_location(div0, file$9, 82, 2, 1870);
    			attr(input0, "class", "form-control form-control-lg");
    			attr(input0, "type", "username");
    			attr(input0, "placeholder", "Username");
    			add_location(input0, file$9, 88, 6, 2049);
    			attr(fieldset0, "class", "form-group");
    			add_location(fieldset0, file$9, 87, 4, 2013);
    			attr(input1, "class", "form-control form-control-lg");
    			attr(input1, "type", "password");
    			attr(input1, "placeholder", "Password");
    			add_location(input1, file$9, 95, 6, 2245);
    			attr(fieldset1, "class", "form-group");
    			add_location(fieldset1, file$9, 94, 4, 2209);
    			attr(button0, "class", "btn btn-sm pull-xs-right btn-info");
    			attr(button0, "type", "submit");
    			button0.disabled = button0_disabled_value = !ctx.username || !ctx.password;
    			add_location(button0, file$9, 101, 4, 2405);
    			add_location(form0, file$9, 86, 2, 1969);
    			add_location(br0, file$9, 108, 2, 2562);
    			attr(div1, "class", "text-danger");
    			add_location(div1, file$9, 109, 2, 2571);
    			add_location(br1, file$9, 110, 2, 2612);
    			add_location(br2, file$9, 112, 2, 2652);
    			attr(input2, "class", "form-control form-control-lg");
    			attr(input2, "type", "text");
    			attr(input2, "placeholder", "Username");
    			add_location(input2, file$9, 115, 6, 2744);
    			attr(fieldset2, "class", "form-group");
    			add_location(fieldset2, file$9, 114, 4, 2708);
    			attr(input3, "class", "form-control form-control-lg");
    			attr(input3, "type", "password");
    			attr(input3, "placeholder", "Password");
    			add_location(input3, file$9, 122, 6, 2936);
    			attr(fieldset3, "class", "form-group");
    			add_location(fieldset3, file$9, 121, 4, 2900);
    			attr(textarea, "class", "form-control");
    			attr(textarea, "rows", "8");
    			attr(textarea, "placeholder", "Profile Description");
    			add_location(textarea, file$9, 129, 6, 3132);
    			attr(fieldset4, "class", "form-group");
    			add_location(fieldset4, file$9, 128, 4, 3096);
    			attr(input4, "class", "form-control form-control-lg");
    			attr(input4, "type", "text");
    			attr(input4, "placeholder", "Avatar URL");
    			add_location(input4, file$9, 136, 6, 3322);
    			attr(fieldset5, "class", "form-group");
    			add_location(fieldset5, file$9, 135, 4, 3286);
    			attr(input5, "class", "form-control form-control-lg");
    			attr(input5, "type", "text");
    			attr(input5, "placeholder", "Invite code");
    			add_location(input5, file$9, 143, 6, 3514);
    			attr(fieldset6, "class", "form-group");
    			add_location(fieldset6, file$9, 142, 4, 3478);
    			attr(button1, "class", "btn btn-sm pull-xs-right btn-info");
    			attr(button1, "type", "submit");
    			button1.disabled = button1_disabled_value = !ctx.username || !ctx.password;
    			add_location(button1, file$9, 150, 4, 3672);
    			add_location(form1, file$9, 113, 2, 2661);

    			dispose = [
    				listen(input0, "input", ctx.input0_input_handler),
    				listen(input1, "input", ctx.input1_input_handler),
    				listen(form0, "submit", prevent_default(ctx.login)),
    				listen(input2, "input", ctx.input2_input_handler),
    				listen(input3, "input", ctx.input3_input_handler),
    				listen(textarea, "input", ctx.textarea_input_handler),
    				listen(input4, "input", ctx.input4_input_handler),
    				listen(input5, "input", ctx.input5_input_handler),
    				listen(form1, "submit", prevent_default(ctx.register))
    			];
    		},

    		m: function mount(target, anchor) {
    			insert(target, div0, anchor);
    			insert(target, t1, anchor);
    			insert(target, form0, anchor);
    			append(form0, fieldset0);
    			append(fieldset0, input0);

    			input0.value = ctx.username;

    			append(form0, t2);
    			append(form0, fieldset1);
    			append(fieldset1, input1);

    			input1.value = ctx.password;

    			append(form0, t3);
    			append(form0, button0);
    			append(button0, t4);
    			insert(target, t5, anchor);
    			insert(target, br0, anchor);
    			insert(target, t6, anchor);
    			insert(target, div1, anchor);
    			append(div1, t7);
    			insert(target, t8, anchor);
    			insert(target, br1, anchor);
    			insert(target, t9, anchor);
    			insert(target, br2, anchor);
    			insert(target, t10, anchor);
    			insert(target, form1, anchor);
    			append(form1, fieldset2);
    			append(fieldset2, input2);

    			input2.value = ctx.username;

    			append(form1, t11);
    			append(form1, fieldset3);
    			append(fieldset3, input3);

    			input3.value = ctx.password;

    			append(form1, t12);
    			append(form1, fieldset4);
    			append(fieldset4, textarea);

    			textarea.value = ctx.description;

    			append(form1, t13);
    			append(form1, fieldset5);
    			append(fieldset5, input4);

    			input4.value = ctx.avatar;

    			append(form1, t14);
    			append(form1, fieldset6);
    			append(fieldset6, input5);

    			input5.value = ctx.invite;

    			append(form1, t15);
    			append(form1, button1);
    			append(button1, t16);
    		},

    		p: function update(changed, ctx) {
    			if (changed.username) input0.value = ctx.username;
    			if (changed.password && (input1.value !== ctx.password)) input1.value = ctx.password;

    			if ((changed.username || changed.password) && button0_disabled_value !== (button0_disabled_value = !ctx.username || !ctx.password)) {
    				button0.disabled = button0_disabled_value;
    			}

    			if (changed.error) {
    				set_data(t7, ctx.error);
    			}

    			if (changed.username && (input2.value !== ctx.username)) input2.value = ctx.username;
    			if (changed.password && (input3.value !== ctx.password)) input3.value = ctx.password;
    			if (changed.description) textarea.value = ctx.description;
    			if (changed.avatar && (input4.value !== ctx.avatar)) input4.value = ctx.avatar;
    			if (changed.invite && (input5.value !== ctx.invite)) input5.value = ctx.invite;

    			if ((changed.username || changed.password) && button1_disabled_value !== (button1_disabled_value = !ctx.username || !ctx.password)) {
    				button1.disabled = button1_disabled_value;
    			}
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(div0);
    				detach(t1);
    				detach(form0);
    				detach(t5);
    				detach(br0);
    				detach(t6);
    				detach(div1);
    				detach(t8);
    				detach(br1);
    				detach(t9);
    				detach(br2);
    				detach(t10);
    				detach(form1);
    			}

    			run_all(dispose);
    		}
    	};
    }

    // (73:0) {#if $session.user}
    function create_if_block$6(ctx) {
    	var h2, a, t0_value = ctx.$session.user.name, t0, a_href_value, t1, button, t3, t4_value = ctx.$session.user.summary, t4, t5, current, dispose;

    	var timeline = new TimeLine({
    		props: {
    		curRoute: ctx.curRoute,
    		session: ctx.session
    	},
    		$$inline: true
    	});

    	return {
    		c: function create() {
    			h2 = element("h2");
    			a = element("a");
    			t0 = text(t0_value);
    			t1 = space();
    			button = element("button");
    			button.textContent = "Logout";
    			t3 = space();
    			t4 = text(t4_value);
    			t5 = space();
    			timeline.$$.fragment.c();
    			attr(a, "href", a_href_value = ctx.$session.user.url);
    			add_location(a, file$9, 74, 4, 1637);
    			attr(button, "class", "btn btn-sm pull-xs-right btn-info");
    			add_location(button, file$9, 75, 4, 1694);
    			add_location(h2, file$9, 73, 2, 1628);
    			dispose = listen(button, "click", ctx.logout);
    		},

    		m: function mount(target, anchor) {
    			insert(target, h2, anchor);
    			append(h2, a);
    			append(a, t0);
    			append(h2, t1);
    			append(h2, button);
    			insert(target, t3, anchor);
    			insert(target, t4, anchor);
    			insert(target, t5, anchor);
    			mount_component(timeline, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if ((!current || changed.$session) && t0_value !== (t0_value = ctx.$session.user.name)) {
    				set_data(t0, t0_value);
    			}

    			if ((!current || changed.$session) && a_href_value !== (a_href_value = ctx.$session.user.url)) {
    				attr(a, "href", a_href_value);
    			}

    			if ((!current || changed.$session) && t4_value !== (t4_value = ctx.$session.user.summary)) {
    				set_data(t4, t4_value);
    			}

    			var timeline_changes = {};
    			if (changed.curRoute) timeline_changes.curRoute = ctx.curRoute;
    			if (changed.session) timeline_changes.session = ctx.session;
    			timeline.$set(timeline_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(timeline.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(timeline.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(h2);
    				detach(t3);
    				detach(t4);
    				detach(t5);
    			}

    			destroy_component(timeline, detaching);

    			dispose();
    		}
    	};
    }

    function create_fragment$9(ctx) {
    	var current_block_type_index, if_block, if_block_anchor, current;

    	var if_block_creators = [
    		create_if_block$6,
    		create_else_block$4
    	];

    	var if_blocks = [];

    	function select_block_type(ctx) {
    		if (ctx.$session.user) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	return {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);
    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(changed, ctx);
    			} else {
    				group_outros();
    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});
    				check_outros();

    				if_block = if_blocks[current_block_type_index];
    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}
    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);

    			if (detaching) {
    				detach(if_block_anchor);
    			}
    		}
    	};
    }

    function instance$8($$self, $$props, $$invalidate) {
    	let $session;

    	
      const dispatch = createEventDispatcher();

      let { curRoute, session } = $$props; validate_store(session, 'session'); component_subscribe($$self, session, $$value => { $session = $$value; $$invalidate('$session', $session); });

      let username = "";
      let password = "";
      let description = "";
      let avatar = "";
      let invite = "";
      let error = "";

      async function login(event) {
        const profile = await xhr(base_url + "/@" + username).catch(error => {
          console.log(error);
        });
        if (!profile) {
          $$invalidate('error', error = "login failed");
          return;
        }

        const token = await xhr(profile.endpoints.oauthTokenEndpoint, {
          method: "POST",
          body: JSON.stringify({ username: username, password: password }),
        });
        if (token.access_token) {
          let newSession = $session;
          newSession.user = profile;
          newSession.token = token.access_token;
          dispatch("updatesession", newSession);
        }
      }

      async function logout(event) {
        dispatch("updatesession", {});
      }

      async function register(event) {
        let user_data = {
          username: username,
          password: password,
          invite: invite,
          profile: {
            type: "Person",
            name: username,
            summary: description,
            icon: {
              type: "Image",
              mediaType: "image/jpeg",
              url: avatar,
            },
          },
        };

        const create_user = await fetch(base_url + "/user", {
          method: "POST",
          body: JSON.stringify(user_data),
        }).then(d => d.json());

        if (create_user.profile) {
          await login();
        }
      }

    	const writable_props = ['curRoute', 'session'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console_1$2.warn(`<Profile> was created with unknown prop '${key}'`);
    	});

    	function input0_input_handler() {
    		username = this.value;
    		$$invalidate('username', username);
    	}

    	function input1_input_handler() {
    		password = this.value;
    		$$invalidate('password', password);
    	}

    	function input2_input_handler() {
    		username = this.value;
    		$$invalidate('username', username);
    	}

    	function input3_input_handler() {
    		password = this.value;
    		$$invalidate('password', password);
    	}

    	function textarea_input_handler() {
    		description = this.value;
    		$$invalidate('description', description);
    	}

    	function input4_input_handler() {
    		avatar = this.value;
    		$$invalidate('avatar', avatar);
    	}

    	function input5_input_handler() {
    		invite = this.value;
    		$$invalidate('invite', invite);
    	}

    	$$self.$set = $$props => {
    		if ('curRoute' in $$props) $$invalidate('curRoute', curRoute = $$props.curRoute);
    		if ('session' in $$props) $$invalidate('session', session = $$props.session);
    	};

    	return {
    		curRoute,
    		session,
    		username,
    		password,
    		description,
    		avatar,
    		invite,
    		error,
    		login,
    		logout,
    		register,
    		$session,
    		input0_input_handler,
    		input1_input_handler,
    		input2_input_handler,
    		input3_input_handler,
    		textarea_input_handler,
    		input4_input_handler,
    		input5_input_handler
    	};
    }

    class Profile extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$9, safe_not_equal, ["curRoute", "session"]);

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.curRoute === undefined && !('curRoute' in props)) {
    			console_1$2.warn("<Profile> was created without expected prop 'curRoute'");
    		}
    		if (ctx.session === undefined && !('session' in props)) {
    			console_1$2.warn("<Profile> was created without expected prop 'session'");
    		}
    	}

    	get curRoute() {
    		throw new Error("<Profile>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set curRoute(value) {
    		throw new Error("<Profile>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get session() {
    		throw new Error("<Profile>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set session(value) {
    		throw new Error("<Profile>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/About.svelte generated by Svelte v3.7.1 */

    function create_fragment$a(ctx) {
    	var t;

    	return {
    		c: function create() {
    			t = text("Minimalist blogging ActivityPub client made with Svelte Could be deployed as\nextension for PubGate, or connected to remote instance Github repo\nhttps://github.com/autogestion/pubgate-philip");
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert(target, t, anchor);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(t);
    			}
    		}
    	};
    }

    class About extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$a, safe_not_equal, []);
    	}
    }

    /* src/components/User.svelte generated by Svelte v3.7.1 */
    const { console: console_1$3 } = globals;

    const file$a = "src/components/User.svelte";

    // (1:0) <script>   import TimeLine from "./TimeLine.svelte";   import { readable }
    function create_catch_block_4(ctx) {
    	return {
    		c: noop,
    		m: noop,
    		p: noop,
    		i: noop,
    		o: noop,
    		d: noop
    	};
    }

    // (40:0) {:then user}
    function create_then_block$2(ctx) {
    	var h2, a0, t0_value = ctx.user.name, t0, a0_href_value, t1, p0, a1, t2, a1_href_value, t3, a2, t4, a2_href_value, t5, a3, t6, a3_href_value, t7, a4, t8, a4_href_value, t9, p1, t10_value = ctx.user.summary, t10, t11, promise, t12, promise_1, t13, promise_2, t14, await_block3_anchor, promise_3, current;

    	let info = {
    		ctx,
    		current: null,
    		token: null,
    		pending: create_pending_block_4,
    		then: create_then_block_4,
    		catch: create_catch_block_3,
    		value: 'outbox_collection',
    		error: 'null',
    		blocks: [,,,]
    	};

    	handle_promise(promise = ctx.followers, info);

    	let info_1 = {
    		ctx,
    		current: null,
    		token: null,
    		pending: create_pending_block_3,
    		then: create_then_block_3,
    		catch: create_catch_block_2,
    		value: 'outbox_collection',
    		error: 'null',
    		blocks: [,,,]
    	};

    	handle_promise(promise_1 = ctx.following, info_1);

    	let info_2 = {
    		ctx,
    		current: null,
    		token: null,
    		pending: create_pending_block_2,
    		then: create_then_block_2,
    		catch: create_catch_block_1,
    		value: 'outbox_collection',
    		error: 'null',
    		blocks: [,,,]
    	};

    	handle_promise(promise_2 = ctx.liked, info_2);

    	let info_3 = {
    		ctx,
    		current: null,
    		token: null,
    		pending: create_pending_block_1,
    		then: create_then_block_1,
    		catch: create_catch_block$2,
    		value: 'outbox_collection',
    		error: 'null',
    		blocks: [,,,]
    	};

    	handle_promise(promise_3 = ctx.timeline, info_3);

    	return {
    		c: function create() {
    			h2 = element("h2");
    			a0 = element("a");
    			t0 = text(t0_value);
    			t1 = space();
    			p0 = element("p");
    			a1 = element("a");
    			t2 = text("Followers");
    			t3 = text("\n    |\n    ");
    			a2 = element("a");
    			t4 = text("Following");
    			t5 = text("\n    |\n    ");
    			a3 = element("a");
    			t6 = text("Timeline");
    			t7 = text("\n    |\n    ");
    			a4 = element("a");
    			t8 = text("Liked");
    			t9 = space();
    			p1 = element("p");
    			t10 = text(t10_value);
    			t11 = space();

    			info.block.c();

    			t12 = space();

    			info_1.block.c();

    			t13 = space();

    			info_2.block.c();

    			t14 = space();
    			await_block3_anchor = empty();

    			info_3.block.c();
    			attr(a0, "href", a0_href_value = ctx.user.url);
    			add_location(a0, file$a, 41, 4, 1051);
    			add_location(h2, file$a, 40, 2, 1042);
    			attr(a1, "href", a1_href_value = ctx.user.followers);
    			add_location(a1, file$a, 44, 4, 1104);
    			attr(a2, "href", a2_href_value = ctx.user.following);
    			add_location(a2, file$a, 46, 4, 1153);
    			attr(a3, "href", a3_href_value = ctx.user.outbox);
    			add_location(a3, file$a, 48, 4, 1202);
    			attr(a4, "href", a4_href_value = ctx.user.liked);
    			add_location(a4, file$a, 50, 4, 1247);
    			add_location(p0, file$a, 43, 2, 1096);
    			add_location(p1, file$a, 53, 2, 1288);
    		},

    		m: function mount(target, anchor) {
    			insert(target, h2, anchor);
    			append(h2, a0);
    			append(a0, t0);
    			insert(target, t1, anchor);
    			insert(target, p0, anchor);
    			append(p0, a1);
    			append(a1, t2);
    			append(p0, t3);
    			append(p0, a2);
    			append(a2, t4);
    			append(p0, t5);
    			append(p0, a3);
    			append(a3, t6);
    			append(p0, t7);
    			append(p0, a4);
    			append(a4, t8);
    			insert(target, t9, anchor);
    			insert(target, p1, anchor);
    			append(p1, t10);
    			insert(target, t11, anchor);

    			info.block.m(target, info.anchor = anchor);
    			info.mount = () => t12.parentNode;
    			info.anchor = t12;

    			insert(target, t12, anchor);

    			info_1.block.m(target, info_1.anchor = anchor);
    			info_1.mount = () => t13.parentNode;
    			info_1.anchor = t13;

    			insert(target, t13, anchor);

    			info_2.block.m(target, info_2.anchor = anchor);
    			info_2.mount = () => t14.parentNode;
    			info_2.anchor = t14;

    			insert(target, t14, anchor);
    			insert(target, await_block3_anchor, anchor);

    			info_3.block.m(target, info_3.anchor = anchor);
    			info_3.mount = () => await_block3_anchor.parentNode;
    			info_3.anchor = await_block3_anchor;

    			current = true;
    		},

    		p: function update(changed, new_ctx) {
    			ctx = new_ctx;
    			if ((!current || changed.profile) && t0_value !== (t0_value = ctx.user.name)) {
    				set_data(t0, t0_value);
    			}

    			if ((!current || changed.profile) && a0_href_value !== (a0_href_value = ctx.user.url)) {
    				attr(a0, "href", a0_href_value);
    			}

    			if ((!current || changed.profile) && a1_href_value !== (a1_href_value = ctx.user.followers)) {
    				attr(a1, "href", a1_href_value);
    			}

    			if ((!current || changed.profile) && a2_href_value !== (a2_href_value = ctx.user.following)) {
    				attr(a2, "href", a2_href_value);
    			}

    			if ((!current || changed.profile) && a3_href_value !== (a3_href_value = ctx.user.outbox)) {
    				attr(a3, "href", a3_href_value);
    			}

    			if ((!current || changed.profile) && a4_href_value !== (a4_href_value = ctx.user.liked)) {
    				attr(a4, "href", a4_href_value);
    			}

    			if ((!current || changed.profile) && t10_value !== (t10_value = ctx.user.summary)) {
    				set_data(t10, t10_value);
    			}

    			info.ctx = ctx;

    			if (('followers' in changed) && promise !== (promise = ctx.followers) && handle_promise(promise, info)) ; else {
    				info.block.p(changed, assign(assign({}, ctx), info.resolved));
    			}

    			info_1.ctx = ctx;

    			if (('following' in changed) && promise_1 !== (promise_1 = ctx.following) && handle_promise(promise_1, info_1)) ; else {
    				info_1.block.p(changed, assign(assign({}, ctx), info_1.resolved));
    			}

    			info_2.ctx = ctx;

    			if (('liked' in changed) && promise_2 !== (promise_2 = ctx.liked) && handle_promise(promise_2, info_2)) ; else {
    				info_2.block.p(changed, assign(assign({}, ctx), info_2.resolved));
    			}

    			info_3.ctx = ctx;

    			if (('timeline' in changed) && promise_3 !== (promise_3 = ctx.timeline) && handle_promise(promise_3, info_3)) ; else {
    				info_3.block.p(changed, assign(assign({}, ctx), info_3.resolved));
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(info.block);
    			transition_in(info_1.block);
    			transition_in(info_2.block);
    			transition_in(info_3.block);
    			current = true;
    		},

    		o: function outro(local) {
    			for (let i = 0; i < 3; i += 1) {
    				const block = info.blocks[i];
    				transition_out(block);
    			}

    			for (let i = 0; i < 3; i += 1) {
    				const block = info_1.blocks[i];
    				transition_out(block);
    			}

    			for (let i = 0; i < 3; i += 1) {
    				const block = info_2.blocks[i];
    				transition_out(block);
    			}

    			for (let i = 0; i < 3; i += 1) {
    				const block = info_3.blocks[i];
    				transition_out(block);
    			}

    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(h2);
    				detach(t1);
    				detach(p0);
    				detach(t9);
    				detach(p1);
    				detach(t11);
    			}

    			info.block.d(detaching);
    			info.token = null;
    			info = null;

    			if (detaching) {
    				detach(t12);
    			}

    			info_1.block.d(detaching);
    			info_1.token = null;
    			info_1 = null;

    			if (detaching) {
    				detach(t13);
    			}

    			info_2.block.d(detaching);
    			info_2.token = null;
    			info_2 = null;

    			if (detaching) {
    				detach(t14);
    				detach(await_block3_anchor);
    			}

    			info_3.block.d(detaching);
    			info_3.token = null;
    			info_3 = null;
    		}
    	};
    }

    // (1:0) <script>   import TimeLine from "./TimeLine.svelte";   import { readable }
    function create_catch_block_3(ctx) {
    	return {
    		c: noop,
    		m: noop,
    		p: noop,
    		i: noop,
    		o: noop,
    		d: noop
    	};
    }

    // (58:2) {:then outbox_collection}
    function create_then_block_4(ctx) {
    	var if_block_anchor, current;

    	var if_block = (ctx.outbox_collection.length) && create_if_block_2$4(ctx);

    	return {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},

    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (ctx.outbox_collection.length) {
    				if (if_block) {
    					if_block.p(changed, ctx);
    					transition_in(if_block, 1);
    				} else {
    					if_block = create_if_block_2$4(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();
    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});
    				check_outros();
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);

    			if (detaching) {
    				detach(if_block_anchor);
    			}
    		}
    	};
    }

    // (59:4) {#if outbox_collection.length}
    function create_if_block_2$4(ctx) {
    	var h3, t_1, current;

    	var timeline_1 = new TimeLine({
    		props: {
    		curRoute: ctx.timelineRoute,
    		session: ctx.session,
    		outbox_collection: ctx.outbox_collection
    	},
    		$$inline: true
    	});

    	return {
    		c: function create() {
    			h3 = element("h3");
    			h3.textContent = "Followers";
    			t_1 = space();
    			timeline_1.$$.fragment.c();
    			add_location(h3, file$a, 59, 6, 1426);
    		},

    		m: function mount(target, anchor) {
    			insert(target, h3, anchor);
    			insert(target, t_1, anchor);
    			mount_component(timeline_1, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var timeline_1_changes = {};
    			if (changed.timelineRoute) timeline_1_changes.curRoute = ctx.timelineRoute;
    			if (changed.session) timeline_1_changes.session = ctx.session;
    			if (changed.followers) timeline_1_changes.outbox_collection = ctx.outbox_collection;
    			timeline_1.$set(timeline_1_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(timeline_1.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(timeline_1.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(h3);
    				detach(t_1);
    			}

    			destroy_component(timeline_1, detaching);
    		}
    	};
    }

    // (56:20)      Loading followers ..   {:then outbox_collection}
    function create_pending_block_4(ctx) {
    	var t;

    	return {
    		c: function create() {
    			t = text("Loading followers ..");
    		},

    		m: function mount(target, anchor) {
    			insert(target, t, anchor);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(t);
    			}
    		}
    	};
    }

    // (1:0) <script>   import TimeLine from "./TimeLine.svelte";   import { readable }
    function create_catch_block_2(ctx) {
    	return {
    		c: noop,
    		m: noop,
    		p: noop,
    		i: noop,
    		o: noop,
    		d: noop
    	};
    }

    // (67:2) {:then outbox_collection}
    function create_then_block_3(ctx) {
    	var if_block_anchor, current;

    	var if_block = (ctx.outbox_collection.length) && create_if_block_1$6(ctx);

    	return {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},

    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (ctx.outbox_collection.length) {
    				if (if_block) {
    					if_block.p(changed, ctx);
    					transition_in(if_block, 1);
    				} else {
    					if_block = create_if_block_1$6(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();
    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});
    				check_outros();
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);

    			if (detaching) {
    				detach(if_block_anchor);
    			}
    		}
    	};
    }

    // (68:4) {#if outbox_collection.length}
    function create_if_block_1$6(ctx) {
    	var h3, t_1, current;

    	var timeline_1 = new TimeLine({
    		props: {
    		curRoute: ctx.timelineRoute,
    		session: ctx.session,
    		outbox_collection: ctx.outbox_collection
    	},
    		$$inline: true
    	});

    	return {
    		c: function create() {
    			h3 = element("h3");
    			h3.textContent = "Following";
    			t_1 = space();
    			timeline_1.$$.fragment.c();
    			add_location(h3, file$a, 68, 6, 1656);
    		},

    		m: function mount(target, anchor) {
    			insert(target, h3, anchor);
    			insert(target, t_1, anchor);
    			mount_component(timeline_1, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var timeline_1_changes = {};
    			if (changed.timelineRoute) timeline_1_changes.curRoute = ctx.timelineRoute;
    			if (changed.session) timeline_1_changes.session = ctx.session;
    			if (changed.following) timeline_1_changes.outbox_collection = ctx.outbox_collection;
    			timeline_1.$set(timeline_1_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(timeline_1.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(timeline_1.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(h3);
    				detach(t_1);
    			}

    			destroy_component(timeline_1, detaching);
    		}
    	};
    }

    // (65:20)      Loading following ..   {:then outbox_collection}
    function create_pending_block_3(ctx) {
    	var t;

    	return {
    		c: function create() {
    			t = text("Loading following ..");
    		},

    		m: function mount(target, anchor) {
    			insert(target, t, anchor);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(t);
    			}
    		}
    	};
    }

    // (1:0) <script>   import TimeLine from "./TimeLine.svelte";   import { readable }
    function create_catch_block_1(ctx) {
    	return {
    		c: noop,
    		m: noop,
    		p: noop,
    		i: noop,
    		o: noop,
    		d: noop
    	};
    }

    // (76:2) {:then outbox_collection}
    function create_then_block_2(ctx) {
    	var if_block_anchor, current;

    	var if_block = (ctx.outbox_collection.length) && create_if_block$7(ctx);

    	return {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},

    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (ctx.outbox_collection.length) {
    				if (if_block) {
    					if_block.p(changed, ctx);
    					transition_in(if_block, 1);
    				} else {
    					if_block = create_if_block$7(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();
    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});
    				check_outros();
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);

    			if (detaching) {
    				detach(if_block_anchor);
    			}
    		}
    	};
    }

    // (77:4) {#if outbox_collection.length}
    function create_if_block$7(ctx) {
    	var h3, t_1, current;

    	var timeline_1 = new TimeLine({
    		props: {
    		curRoute: ctx.timelineRoute,
    		session: ctx.session,
    		outbox_collection: ctx.outbox_collection
    	},
    		$$inline: true
    	});

    	return {
    		c: function create() {
    			h3 = element("h3");
    			h3.textContent = "Liked";
    			t_1 = space();
    			timeline_1.$$.fragment.c();
    			add_location(h3, file$a, 77, 6, 1884);
    		},

    		m: function mount(target, anchor) {
    			insert(target, h3, anchor);
    			insert(target, t_1, anchor);
    			mount_component(timeline_1, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var timeline_1_changes = {};
    			if (changed.timelineRoute) timeline_1_changes.curRoute = ctx.timelineRoute;
    			if (changed.session) timeline_1_changes.session = ctx.session;
    			if (changed.liked) timeline_1_changes.outbox_collection = ctx.outbox_collection;
    			timeline_1.$set(timeline_1_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(timeline_1.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(timeline_1.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(h3);
    				detach(t_1);
    			}

    			destroy_component(timeline_1, detaching);
    		}
    	};
    }

    // (74:16)      Loading liked posts ..   {:then outbox_collection}
    function create_pending_block_2(ctx) {
    	var t;

    	return {
    		c: function create() {
    			t = text("Loading liked posts ..");
    		},

    		m: function mount(target, anchor) {
    			insert(target, t, anchor);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(t);
    			}
    		}
    	};
    }

    // (1:0) <script>   import TimeLine from "./TimeLine.svelte";   import { readable }
    function create_catch_block$2(ctx) {
    	return {
    		c: noop,
    		m: noop,
    		p: noop,
    		i: noop,
    		o: noop,
    		d: noop
    	};
    }

    // (85:2) {:then outbox_collection}
    function create_then_block_1(ctx) {
    	var h3, t_1, current;

    	var timeline_1 = new TimeLine({
    		props: {
    		curRoute: ctx.timelineRoute,
    		session: ctx.session,
    		outbox_collection: ctx.outbox_collection
    	},
    		$$inline: true
    	});

    	return {
    		c: function create() {
    			h3 = element("h3");
    			h3.textContent = "Posts";
    			t_1 = space();
    			timeline_1.$$.fragment.c();
    			add_location(h3, file$a, 85, 4, 2068);
    		},

    		m: function mount(target, anchor) {
    			insert(target, h3, anchor);
    			insert(target, t_1, anchor);
    			mount_component(timeline_1, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var timeline_1_changes = {};
    			if (changed.timelineRoute) timeline_1_changes.curRoute = ctx.timelineRoute;
    			if (changed.session) timeline_1_changes.session = ctx.session;
    			if (changed.timeline) timeline_1_changes.outbox_collection = ctx.outbox_collection;
    			timeline_1.$set(timeline_1_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(timeline_1.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(timeline_1.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(h3);
    				detach(t_1);
    			}

    			destroy_component(timeline_1, detaching);
    		}
    	};
    }

    // (83:19)      Loading posts ..   {:then outbox_collection}
    function create_pending_block_1(ctx) {
    	var t;

    	return {
    		c: function create() {
    			t = text("Loading posts ..");
    		},

    		m: function mount(target, anchor) {
    			insert(target, t, anchor);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(t);
    			}
    		}
    	};
    }

    // (37:16)    Shortly this page will show info about   <b>{username}
    function create_pending_block$2(ctx) {
    	var t0, b, t1;

    	return {
    		c: function create() {
    			t0 = text("Shortly this page will show info about\n  ");
    			b = element("b");
    			t1 = text(ctx.username);
    			add_location(b, file$a, 38, 2, 1009);
    		},

    		m: function mount(target, anchor) {
    			insert(target, t0, anchor);
    			insert(target, b, anchor);
    			append(b, t1);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(t0);
    				detach(b);
    			}
    		}
    	};
    }

    function create_fragment$b(ctx) {
    	var await_block_anchor, promise, current;

    	let info = {
    		ctx,
    		current: null,
    		token: null,
    		pending: create_pending_block$2,
    		then: create_then_block$2,
    		catch: create_catch_block_4,
    		value: 'user',
    		error: 'null',
    		blocks: [,,,]
    	};

    	handle_promise(promise = ctx.profile, info);

    	return {
    		c: function create() {
    			await_block_anchor = empty();

    			info.block.c();
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert(target, await_block_anchor, anchor);

    			info.block.m(target, info.anchor = anchor);
    			info.mount = () => await_block_anchor.parentNode;
    			info.anchor = await_block_anchor;

    			current = true;
    		},

    		p: function update(changed, new_ctx) {
    			ctx = new_ctx;
    			info.ctx = ctx;

    			if (('profile' in changed) && promise !== (promise = ctx.profile) && handle_promise(promise, info)) ; else {
    				info.block.p(changed, assign(assign({}, ctx), info.resolved));
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(info.block);
    			current = true;
    		},

    		o: function outro(local) {
    			for (let i = 0; i < 3; i += 1) {
    				const block = info.blocks[i];
    				transition_out(block);
    			}

    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(await_block_anchor);
    			}

    			info.block.d(detaching);
    			info.token = null;
    			info = null;
    		}
    	};
    }

    function instance$9($$self, $$props, $$invalidate) {
    	let $curRoute;

    	
      const timelineRoute = readable("/search");

      let { curRoute, session } = $$props; validate_store(curRoute, 'curRoute'); component_subscribe($$self, curRoute, $$value => { $curRoute = $$value; $$invalidate('$curRoute', $curRoute); });

      const username = $curRoute.match(/^\/@([^\/]+)$/)[1];
      let timeline = null;
      let followers = null;
      let following = null;
      let liked = null;

      let headers = { Accept: "application/activity+json" };
      const fetchJSON = (url, cb = d => d) =>
        fetch(url, { headers })
          .then(d => d.json())
          .then(cb);

      const fetchUser = path => {
        return fetch(base_url + path, { headers })
          .then(d => d.json())
          .then(d => {
            console.log("[User]Fetching timeline", d.outbox);
            $$invalidate('timeline', timeline = fetchJSON(d.outbox, d => d.first));
            $$invalidate('followers', followers = fetchJSON(d.followers));
            $$invalidate('following', following = fetchJSON(d.following));
            $$invalidate('liked', liked = fetchJSON(d.liked));
            return d;
          });
      };

    	const writable_props = ['curRoute', 'session'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console_1$3.warn(`<User> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ('curRoute' in $$props) $$invalidate('curRoute', curRoute = $$props.curRoute);
    		if ('session' in $$props) $$invalidate('session', session = $$props.session);
    	};

    	let profile;

    	$$self.$$.update = ($$dirty = { $curRoute: 1 }) => {
    		if ($$dirty.$curRoute) { $$invalidate('profile', profile = fetchUser($curRoute)); }
    	};

    	return {
    		timelineRoute,
    		curRoute,
    		session,
    		username,
    		timeline,
    		followers,
    		following,
    		liked,
    		profile
    	};
    }

    class User extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$9, create_fragment$b, safe_not_equal, ["curRoute", "session"]);

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.curRoute === undefined && !('curRoute' in props)) {
    			console_1$3.warn("<User> was created without expected prop 'curRoute'");
    		}
    		if (ctx.session === undefined && !('session' in props)) {
    			console_1$3.warn("<User> was created without expected prop 'session'");
    		}
    	}

    	get curRoute() {
    		throw new Error("<User>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set curRoute(value) {
    		throw new Error("<User>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get session() {
    		throw new Error("<User>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set session(value) {
    		throw new Error("<User>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/Object.svelte generated by Svelte v3.7.1 */
    const { Object: Object_1 } = globals;

    // (1:0) <script>   import Post from "./Post.svelte";    export let curRoute;   export let session;    let id = $curRoute.match(/^\/@([^\/]+)\/object\/(.+)$/)[2];    const fetchObject = function(path, session = {}
    function create_catch_block$3(ctx) {
    	return {
    		c: noop,
    		m: noop,
    		p: noop,
    		i: noop,
    		o: noop,
    		d: noop
    	};
    }

    // (23:0) {:then post}
    function create_then_block$3(ctx) {
    	var current;

    	var post = new Post({
    		props: { post: ctx.post, session: ctx.session },
    		$$inline: true
    	});

    	return {
    		c: function create() {
    			post.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(post, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var post_changes = {};
    			if (changed.object) post_changes.post = ctx.post;
    			if (changed.session) post_changes.session = ctx.session;
    			post.$set(post_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(post.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(post.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(post, detaching);
    		}
    	};
    }

    // (21:15)    So you want to see object {id}
    function create_pending_block$3(ctx) {
    	var t0, t1, t2;

    	return {
    		c: function create() {
    			t0 = text("So you want to see object ");
    			t1 = text(ctx.id);
    			t2 = text("?");
    		},

    		m: function mount(target, anchor) {
    			insert(target, t0, anchor);
    			insert(target, t1, anchor);
    			insert(target, t2, anchor);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(t0);
    				detach(t1);
    				detach(t2);
    			}
    		}
    	};
    }

    function create_fragment$c(ctx) {
    	var await_block_anchor, promise, current;

    	let info = {
    		ctx,
    		current: null,
    		token: null,
    		pending: create_pending_block$3,
    		then: create_then_block$3,
    		catch: create_catch_block$3,
    		value: 'post',
    		error: 'null',
    		blocks: [,,,]
    	};

    	handle_promise(promise = ctx.object, info);

    	return {
    		c: function create() {
    			await_block_anchor = empty();

    			info.block.c();
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert(target, await_block_anchor, anchor);

    			info.block.m(target, info.anchor = anchor);
    			info.mount = () => await_block_anchor.parentNode;
    			info.anchor = await_block_anchor;

    			current = true;
    		},

    		p: function update(changed, new_ctx) {
    			ctx = new_ctx;
    			info.ctx = ctx;

    			if (('object' in changed) && promise !== (promise = ctx.object) && handle_promise(promise, info)) ; else {
    				info.block.p(changed, assign(assign({}, ctx), info.resolved));
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(info.block);
    			current = true;
    		},

    		o: function outro(local) {
    			for (let i = 0; i < 3; i += 1) {
    				const block = info.blocks[i];
    				transition_out(block);
    			}

    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(await_block_anchor);
    			}

    			info.block.d(detaching);
    			info.token = null;
    			info = null;
    		}
    	};
    }

    function instance$a($$self, $$props, $$invalidate) {
    	let $curRoute, $session;

    	let { curRoute } = $$props; validate_store(curRoute, 'curRoute'); component_subscribe($$self, curRoute, $$value => { $curRoute = $$value; $$invalidate('$curRoute', $curRoute); });
      let { session } = $$props; validate_store(session, 'session'); component_subscribe($$self, session, $$value => { $session = $$value; $$invalidate('$session', $session); });

      let id = $curRoute.match(/^\/@([^\/]+)\/object\/(.+)$/)[2];

      const fetchObject = function(path, session = {}) {
        let headers_set = {
          Accept: "application/activity+json",
        };
        return fetch(base_url + path, { headers: headers_set })
          .then(d => d.json())
          .then(d => d);
      };

    	const writable_props = ['curRoute', 'session'];
    	Object_1.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Object> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ('curRoute' in $$props) $$invalidate('curRoute', curRoute = $$props.curRoute);
    		if ('session' in $$props) $$invalidate('session', session = $$props.session);
    	};

    	let object;

    	$$self.$$.update = ($$dirty = { $curRoute: 1, $session: 1 }) => {
    		if ($$dirty.$curRoute || $$dirty.$session) { $$invalidate('object', object = fetchObject($curRoute, $session)); }
    	};

    	return { curRoute, session, id, object };
    }

    class Object$1 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$a, create_fragment$c, safe_not_equal, ["curRoute", "session"]);

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.curRoute === undefined && !('curRoute' in props)) {
    			console.warn("<Object> was created without expected prop 'curRoute'");
    		}
    		if (ctx.session === undefined && !('session' in props)) {
    			console.warn("<Object> was created without expected prop 'session'");
    		}
    	}

    	get curRoute() {
    		throw new Error("<Object>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set curRoute(value) {
    		throw new Error("<Object>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get session() {
    		throw new Error("<Object>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set session(value) {
    		throw new Error("<Object>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/Error.svelte generated by Svelte v3.7.1 */
    const { Error: Error_1 } = globals;

    function create_fragment$d(ctx) {
    	var t0, t1, t2;

    	return {
    		c: function create() {
    			t0 = text("You wanted to see ");
    			t1 = text(ctx.$curRoute);
    			t2 = text(" but we don't have it :/");
    		},

    		l: function claim(nodes) {
    			throw new Error_1("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert(target, t0, anchor);
    			insert(target, t1, anchor);
    			insert(target, t2, anchor);
    		},

    		p: function update(changed, ctx) {
    			if (changed.$curRoute) {
    				set_data(t1, ctx.$curRoute);
    			}
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(t0);
    				detach(t1);
    				detach(t2);
    			}
    		}
    	};
    }

    function instance$b($$self, $$props, $$invalidate) {
    	let $curRoute;

    	let { curRoute, session } = $$props; validate_store(curRoute, 'curRoute'); component_subscribe($$self, curRoute, $$value => { $curRoute = $$value; $$invalidate('$curRoute', $curRoute); });

    	const writable_props = ['curRoute', 'session'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Error> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ('curRoute' in $$props) $$invalidate('curRoute', curRoute = $$props.curRoute);
    		if ('session' in $$props) $$invalidate('session', session = $$props.session);
    	};

    	return { curRoute, session, $curRoute };
    }

    class Error$1 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$b, create_fragment$d, safe_not_equal, ["curRoute", "session"]);

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.curRoute === undefined && !('curRoute' in props)) {
    			console.warn("<Error> was created without expected prop 'curRoute'");
    		}
    		if (ctx.session === undefined && !('session' in props)) {
    			console.warn("<Error> was created without expected prop 'session'");
    		}
    	}

    	get curRoute() {
    		throw new Error_1("<Error>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set curRoute(value) {
    		throw new Error_1("<Error>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get session() {
    		throw new Error_1("<Error>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set session(value) {
    		throw new Error_1("<Error>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const curRoute = writable(window.location.pathname);

    const routes = {
      "/local": { name: "Local Timeline", component: TimeLine },
      "/federated": { name: "Federated Timeline", component: TimeLine },
      "/create": { name: "Create", component: Publish },
      "/search": { name: "Search", component: Search },
      "/inbox": { name: "Inbox", component: TimeLine },
      "/profile": { name: "Profile", component: Profile },
      "/about": { name: "About", component: About },
      user: { component: User },
      object: { component: Object$1 },
      error: { component: Error$1 },
    };

    const session = writable({});

    /* src/Router.svelte generated by Svelte v3.7.1 */

    const file$b = "src/Router.svelte";

    function create_fragment$e(ctx) {
    	var div, current;

    	var switch_value = ctx.component;

    	function switch_props(ctx) {
    		return {
    			props: {
    			curRoute: ctx.curRoute,
    			session: ctx.session
    		},
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		var switch_instance = new switch_value(switch_props(ctx));
    		switch_instance.$on("updatesession", ctx.updateSession);
    	}

    	return {
    		c: function create() {
    			div = element("div");
    			if (switch_instance) switch_instance.$$.fragment.c();
    			attr(div, "class", "content");
    			add_location(div, file$b, 28, 0, 705);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert(target, div, anchor);

    			if (switch_instance) {
    				mount_component(switch_instance, div, null);
    			}

    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var switch_instance_changes = {};
    			if (changed.curRoute) switch_instance_changes.curRoute = ctx.curRoute;
    			if (changed.session) switch_instance_changes.session = ctx.session;

    			if (switch_value !== (switch_value = ctx.component)) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;
    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});
    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props(ctx));
    					switch_instance.$on("updatesession", ctx.updateSession);

    					switch_instance.$$.fragment.c();
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, div, null);
    				} else {
    					switch_instance = null;
    				}
    			}

    			else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(div);
    			}

    			if (switch_instance) destroy_component(switch_instance);
    		}
    	};
    }

    function instance$c($$self, $$props, $$invalidate) {
    	let $curRoute;

    	let { routes, curRoute } = $$props; validate_store(curRoute, 'curRoute'); component_subscribe($$self, curRoute, $$value => { $curRoute = $$value; $$invalidate('$curRoute', $curRoute); });
      if ($curRoute === "/") curRoute.set("/local");

      let { updateSession, session } = $$props;

      let component;

      const unsubscribe = curRoute.subscribe(value => {
        const page = routes[$curRoute];
        let objectMatch = $curRoute.match(/^\/@([^\/]+)\/object\/(.+)$/);
        let userMatch = $curRoute.match(/^\/@([^\/]+)$/);
        if (page) $$invalidate('component', component = page.component);
        else if (objectMatch) $$invalidate('component', component = routes.object.component);
        else if (userMatch) $$invalidate('component', component = routes.user.component);
        if (!component) $$invalidate('component', component = routes.error.component);
      });
      onDestroy(unsubscribe);

    	const writable_props = ['routes', 'curRoute', 'updateSession', 'session'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Router> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ('routes' in $$props) $$invalidate('routes', routes = $$props.routes);
    		if ('curRoute' in $$props) $$invalidate('curRoute', curRoute = $$props.curRoute);
    		if ('updateSession' in $$props) $$invalidate('updateSession', updateSession = $$props.updateSession);
    		if ('session' in $$props) $$invalidate('session', session = $$props.session);
    	};

    	return {
    		routes,
    		curRoute,
    		updateSession,
    		session,
    		component
    	};
    }

    class Router extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$c, create_fragment$e, safe_not_equal, ["routes", "curRoute", "updateSession", "session"]);

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.routes === undefined && !('routes' in props)) {
    			console.warn("<Router> was created without expected prop 'routes'");
    		}
    		if (ctx.curRoute === undefined && !('curRoute' in props)) {
    			console.warn("<Router> was created without expected prop 'curRoute'");
    		}
    		if (ctx.updateSession === undefined && !('updateSession' in props)) {
    			console.warn("<Router> was created without expected prop 'updateSession'");
    		}
    		if (ctx.session === undefined && !('session' in props)) {
    			console.warn("<Router> was created without expected prop 'session'");
    		}
    	}

    	get routes() {
    		throw new Error("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set routes(value) {
    		throw new Error("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get curRoute() {
    		throw new Error("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set curRoute(value) {
    		throw new Error("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get updateSession() {
    		throw new Error("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set updateSession(value) {
    		throw new Error("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get session() {
    		throw new Error("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set session(value) {
    		throw new Error("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/App.svelte generated by Svelte v3.7.1 */

    function create_fragment$f(ctx) {
    	var t0, t1, current;

    	var navigation = new Navigation({
    		props: {
    		routes: routes,
    		curRoute: curRoute,
    		selectTab: selectTab,
    		session: session,
    		pgi: ctx.pgi
    	},
    		$$inline: true
    	});

    	var router = new Router({
    		props: {
    		routes: routes,
    		curRoute: curRoute,
    		session: session,
    		updateSession: ctx.updateSession
    	},
    		$$inline: true
    	});

    	var footer = new Footer({ $$inline: true });

    	return {
    		c: function create() {
    			navigation.$$.fragment.c();
    			t0 = space();
    			router.$$.fragment.c();
    			t1 = space();
    			footer.$$.fragment.c();
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			mount_component(navigation, target, anchor);
    			insert(target, t0, anchor);
    			mount_component(router, target, anchor);
    			insert(target, t1, anchor);
    			mount_component(footer, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var navigation_changes = {};
    			if (changed.routes) navigation_changes.routes = routes;
    			if (changed.curRoute) navigation_changes.curRoute = curRoute;
    			if (changed.selectTab) navigation_changes.selectTab = selectTab;
    			if (changed.session) navigation_changes.session = session;
    			if (changed.pgi) navigation_changes.pgi = ctx.pgi;
    			navigation.$set(navigation_changes);

    			var router_changes = {};
    			if (changed.routes) router_changes.routes = routes;
    			if (changed.curRoute) router_changes.curRoute = curRoute;
    			if (changed.session) router_changes.session = session;
    			if (changed.updateSession) router_changes.updateSession = ctx.updateSession;
    			router.$set(router_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(navigation.$$.fragment, local);

    			transition_in(router.$$.fragment, local);

    			transition_in(footer.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(navigation.$$.fragment, local);
    			transition_out(router.$$.fragment, local);
    			transition_out(footer.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(navigation, detaching);

    			if (detaching) {
    				detach(t0);
    			}

    			destroy_component(router, detaching);

    			if (detaching) {
    				detach(t1);
    			}

    			destroy_component(footer, detaching);
    		}
    	};
    }

    function selectTab(target) {
      const path = target.pathname;
      Array.prototype.forEach.call(
        target.parentNode.parentNode.children,
        (el, i) => {
          if (el.firstChild.href.split("/")[1] !== path) {
            el.firstChild.classList.remove("header-selected");
          }
        }
      );
      target.classList.add("header-selected");
    }

    function instance$d($$self, $$props, $$invalidate) {
    	let $session;

    	validate_store(session, 'session');
    	component_subscribe($$self, session, $$value => { $session = $$value; $$invalidate('$session', $session); });

    	

      let pgi = pubgate_instance;

      const updateSession = e => {
        session.set(e.detail);
        saveToStore("session", $session);
      };
      const saveToStore = (key, value) => {
        //console.log("saving", key, value);
        localStorage.setItem(key, JSON.stringify(value));
      };
      const loadFromStore = key => {
        //console.log("loading", key);
        return JSON.parse(localStorage.getItem(key));
      };

      session.set(loadFromStore("session") || {});

    	return { pgi, updateSession };
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$d, create_fragment$f, safe_not_equal, []);
    	}
    }

    const app = new App({
      target: document.body,
      props: { name: "app" },
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
