
(function(l, i, v, e) { v = l.createElement(i); v.async = 1; v.src = '//' + (location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; e = l.getElementsByTagName(i)[0]; e.parentNode.insertBefore(v, e)})(document, 'script');
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function is_promise(value) {
        return value && typeof value.then === 'function';
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
    function subscribe(component, store, callback) {
        const unsub = store.subscribe(callback);
        component.$$.on_destroy.push(unsub.unsubscribe
            ? () => unsub.unsubscribe()
            : unsub);
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

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
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
                binding_callbacks.shift()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            while (render_callbacks.length) {
                const callback = render_callbacks.pop();
                if (!seen_callbacks.has(callback)) {
                    callback();
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                }
            }
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
    }
    function update($$) {
        if ($$.fragment) {
            $$.update($$.dirty);
            run_all($$.before_render);
            $$.fragment.p($$.dirty, $$.ctx);
            $$.dirty = null;
            $$.after_render.forEach(add_render_callback);
        }
    }
    let outros;
    function group_outros() {
        outros = {
            remaining: 0,
            callbacks: []
        };
    }
    function check_outros() {
        if (!outros.remaining) {
            run_all(outros.callbacks);
        }
    }
    function on_outro(callback) {
        outros.callbacks.push(callback);
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
                            on_outro(() => {
                                block.d(1);
                                info.blocks[i] = null;
                            });
                            block.o(1);
                            check_outros();
                        }
                    });
                }
                else {
                    info.block.d(1);
                }
                block.c();
                if (block.i)
                    block.i(1);
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
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_render } = component.$$;
        fragment.m(target, anchor);
        // onMount happens after the initial afterUpdate. Because
        // afterUpdate callbacks happen in reverse order (inner first)
        // we schedule onMount callbacks before afterUpdate callbacks
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
        after_render.forEach(add_render_callback);
    }
    function destroy(component, detaching) {
        if (component.$$) {
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
    function init(component, options, instance, create_fragment, not_equal$$1, prop_names) {
        const parent_component = current_component;
        set_current_component(component);
        const props = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props: prop_names,
            update: noop,
            not_equal: not_equal$$1,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_render: [],
            after_render: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty: null
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, props, (key, value) => {
                if ($$.ctx && not_equal$$1($$.ctx[key], $$.ctx[key] = value)) {
                    if ($$.bound[key])
                        $$.bound[key](value);
                    if (ready)
                        make_dirty(component, key);
                }
            })
            : props;
        $$.update();
        ready = true;
        run_all($$.before_render);
        $$.fragment = create_fragment($$.ctx);
        if (options.target) {
            if (options.hydrate) {
                $$.fragment.l(children(options.target));
            }
            else {
                $$.fragment.c();
            }
            if (options.intro && component.$$.fragment.i)
                component.$$.fragment.i();
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy(this, true);
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

    /* src/PostBody.svelte generated by Svelte v3.4.3 */

    const file = "src/PostBody.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.tag = list[i];
    	return child_ctx;
    }

    // (9:0) {:else}
    function create_else_block(ctx) {
    	var div0, a0, t0_value = ctx.post.type, t0, a0_href_value, t1, a1, t2_value = ctx.post.attributedTo.split('/').pop(), t2, a1_href_value, t3, span0, t5, span1, t6_value = ctx.post.published.replace("T", " ").replace("Z", " "), t6, t7, div1, t8, p, raw_value = ctx.post.content;

    	var each_value = ctx.post.tag;

    	var each_blocks = [];

    	for (var i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	return {
    		c: function create() {
    			div0 = element("div");
    			a0 = element("a");
    			t0 = text(t0_value);
    			t1 = text(" by user ");
    			a1 = element("a");
    			t2 = text(t2_value);
    			t3 = space();
    			span0 = element("span");
    			span0.textContent = "·";
    			t5 = space();
    			span1 = element("span");
    			t6 = text(t6_value);
    			t7 = space();
    			div1 = element("div");

    			for (var i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t8 = space();
    			p = element("p");
    			a0.href = a0_href_value = ctx.post.id;
    			add_location(a0, file, 10, 4, 127);
    			a1.href = a1_href_value = ctx.post.attributedTo;
    			add_location(a1, file, 10, 48, 171);
    			span0.className = "metadata-seperator";
    			add_location(span0, file, 11, 4, 250);
    			add_location(span1, file, 12, 4, 296);
    			div0.className = "metadata";
    			add_location(div0, file, 9, 0, 100);
    			div1.className = "tags";
    			add_location(div1, file, 14, 0, 370);
    			add_location(p, file, 20, 0, 485);
    		},

    		m: function mount(target, anchor) {
    			insert(target, div0, anchor);
    			append(div0, a0);
    			append(a0, t0);
    			append(div0, t1);
    			append(div0, a1);
    			append(a1, t2);
    			append(div0, t3);
    			append(div0, span0);
    			append(div0, t5);
    			append(div0, span1);
    			append(span1, t6);
    			insert(target, t7, anchor);
    			insert(target, div1, anchor);

    			for (var i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div1, null);
    			}

    			insert(target, t8, anchor);
    			insert(target, p, anchor);
    			p.innerHTML = raw_value;
    		},

    		p: function update(changed, ctx) {
    			if ((changed.post) && t0_value !== (t0_value = ctx.post.type)) {
    				set_data(t0, t0_value);
    			}

    			if ((changed.post) && a0_href_value !== (a0_href_value = ctx.post.id)) {
    				a0.href = a0_href_value;
    			}

    			if ((changed.post) && t2_value !== (t2_value = ctx.post.attributedTo.split('/').pop())) {
    				set_data(t2, t2_value);
    			}

    			if ((changed.post) && a1_href_value !== (a1_href_value = ctx.post.attributedTo)) {
    				a1.href = a1_href_value;
    			}

    			if ((changed.post) && t6_value !== (t6_value = ctx.post.published.replace("T", " ").replace("Z", " "))) {
    				set_data(t6, t6_value);
    			}

    			if (changed.post) {
    				each_value = ctx.post.tag;

    				for (var i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(changed, child_ctx);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div1, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}
    				each_blocks.length = each_value.length;
    			}

    			if ((changed.post) && raw_value !== (raw_value = ctx.post.content)) {
    				p.innerHTML = raw_value;
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(div0);
    				detach(t7);
    				detach(div1);
    			}

    			destroy_each(each_blocks, detaching);

    			if (detaching) {
    				detach(t8);
    				detach(p);
    			}
    		}
    	};
    }

    // (6:0) {#if typeof post === 'string'}
    function create_if_block(ctx) {
    	var p;

    	return {
    		c: function create() {
    			p = element("p");
    			add_location(p, file, 6, 0, 70);
    		},

    		m: function mount(target, anchor) {
    			insert(target, p, anchor);
    			p.innerHTML = ctx.post;
    		},

    		p: function update(changed, ctx) {
    			if (changed.post) {
    				p.innerHTML = ctx.post;
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(p);
    			}
    		}
    	};
    }

    // (16:0) {#each post.tag as tag}
    function create_each_block(ctx) {
    	var a, t_value = ctx.tag.name, t, a_href_value;

    	return {
    		c: function create() {
    			a = element("a");
    			t = text(t_value);
    			a.className = "tag";
    			a.href = a_href_value = ctx.tag.href;
    			add_location(a, file, 16, 4, 417);
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
    				a.href = a_href_value;
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(a);
    			}
    		}
    	};
    }

    function create_fragment(ctx) {
    	var if_block_anchor;

    	function select_block_type(ctx) {
    		if (typeof ctx.post === 'string') return create_if_block;
    		return create_else_block;
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

    function instance($$self, $$props, $$invalidate) {
    	let { post } = $$props;

    	const writable_props = ['post'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key)) console.warn(`<PostBody> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ('post' in $$props) $$invalidate('post', post = $$props.post);
    	};

    	return { post };
    }

    class PostBody extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, ["post"]);

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.post === undefined && !('post' in props)) {
    			console.warn("<PostBody> was created without expected prop 'post'");
    		}
    	}

    	get post() {
    		throw new Error("<PostBody>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set post(value) {
    		throw new Error("<PostBody>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Post.svelte generated by Svelte v3.4.3 */

    const file$1 = "src/Post.svelte";

    // (36:0) {:else}
    function create_else_block$1(ctx) {
    	var li, div0, h2, t1, a0, t2_value = ctx.post.type, t2, a0_href_value, t3, a1, t4_value = ctx.post.actor.split('/').slice(-1)[0], t4, a1_href_value, t5, span, t7, t8, div1, current;

    	var if_block = (ctx.post.published) && create_if_block_1(ctx);

    	var postbody = new PostBody({
    		props: { post: ctx.post_object },
    		$$inline: true
    	});

    	return {
    		c: function create() {
    			li = element("li");
    			div0 = element("div");
    			h2 = element("h2");
    			h2.textContent = ".";
    			t1 = space();
    			a0 = element("a");
    			t2 = text(t2_value);
    			t3 = text(" by user ");
    			a1 = element("a");
    			t4 = text(t4_value);
    			t5 = space();
    			span = element("span");
    			span.textContent = "·";
    			t7 = space();
    			if (if_block) if_block.c();
    			t8 = space();
    			div1 = element("div");
    			postbody.$$.fragment.c();
    			h2.id = "";
    			add_location(h2, file$1, 38, 8, 747);
    			a0.href = a0_href_value = ctx.post.id;
    			add_location(a0, file$1, 39, 8, 774);
    			a1.href = a1_href_value = ctx.post.actor;
    			add_location(a1, file$1, 39, 52, 818);
    			span.className = "metadata-seperator";
    			add_location(span, file$1, 40, 8, 894);
    			div0.className = "metadata";
    			add_location(div0, file$1, 37, 4, 716);
    			div1.className = "reaction svelte-1gf6p2q";
    			add_location(div1, file$1, 46, 4, 1072);
    			li.className = "post";
    			add_location(li, file$1, 36, 0, 694);
    		},

    		m: function mount(target, anchor) {
    			insert(target, li, anchor);
    			append(li, div0);
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
    			append(li, t8);
    			append(li, div1);
    			mount_component(postbody, div1, null);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if ((!current || changed.post) && t2_value !== (t2_value = ctx.post.type)) {
    				set_data(t2, t2_value);
    			}

    			if ((!current || changed.post) && a0_href_value !== (a0_href_value = ctx.post.id)) {
    				a0.href = a0_href_value;
    			}

    			if ((!current || changed.post) && t4_value !== (t4_value = ctx.post.actor.split('/').slice(-1)[0])) {
    				set_data(t4, t4_value);
    			}

    			if ((!current || changed.post) && a1_href_value !== (a1_href_value = ctx.post.actor)) {
    				a1.href = a1_href_value;
    			}

    			if (ctx.post.published) {
    				if (if_block) {
    					if_block.p(changed, ctx);
    				} else {
    					if_block = create_if_block_1(ctx);
    					if_block.c();
    					if_block.m(div0, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			var postbody_changes = {};
    			if (changed.post_object) postbody_changes.post = ctx.post_object;
    			postbody.$set(postbody_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			postbody.$$.fragment.i(local);

    			current = true;
    		},

    		o: function outro(local) {
    			postbody.$$.fragment.o(local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(li);
    			}

    			if (if_block) if_block.d();

    			postbody.$destroy();
    		}
    	};
    }

    // (30:0) {#if fetched_post == false}
    function create_if_block$1(ctx) {
    	var li, h2, t_1, current;

    	var postbody = new PostBody({
    		props: { post: ctx.post.object },
    		$$inline: true
    	});

    	return {
    		c: function create() {
    			li = element("li");
    			h2 = element("h2");
    			h2.textContent = ".";
    			t_1 = space();
    			postbody.$$.fragment.c();
    			h2.id = "";
    			add_location(h2, file$1, 31, 4, 624);
    			li.className = "post";
    			add_location(li, file$1, 30, 0, 602);
    		},

    		m: function mount(target, anchor) {
    			insert(target, li, anchor);
    			append(li, h2);
    			append(li, t_1);
    			mount_component(postbody, li, null);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var postbody_changes = {};
    			if (changed.post) postbody_changes.post = ctx.post.object;
    			postbody.$set(postbody_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			postbody.$$.fragment.i(local);

    			current = true;
    		},

    		o: function outro(local) {
    			postbody.$$.fragment.o(local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(li);
    			}

    			postbody.$destroy();
    		}
    	};
    }

    // (43:8) {#if post.published }
    function create_if_block_1(ctx) {
    	var span, t_value = ctx.post.published.replace("T", " ").replace("Z", " "), t;

    	return {
    		c: function create() {
    			span = element("span");
    			t = text(t_value);
    			add_location(span, file$1, 43, 8, 975);
    		},

    		m: function mount(target, anchor) {
    			insert(target, span, anchor);
    			append(span, t);
    		},

    		p: function update(changed, ctx) {
    			if ((changed.post) && t_value !== (t_value = ctx.post.published.replace("T", " ").replace("Z", " "))) {
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

    function create_fragment$1(ctx) {
    	var current_block_type_index, if_block, if_block_anchor, current;

    	var if_block_creators = [
    		create_if_block$1,
    		create_else_block$1
    	];

    	var if_blocks = [];

    	function select_block_type(ctx) {
    		if (ctx.fetched_post == false) return 0;
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
    				on_outro(() => {
    					if_blocks[previous_block_index].d(1);
    					if_blocks[previous_block_index] = null;
    				});
    				if_block.o(1);
    				check_outros();

    				if_block = if_blocks[current_block_type_index];
    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}
    				if_block.i(1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			if (if_block) if_block.i();
    			current = true;
    		},

    		o: function outro(local) {
    			if (if_block) if_block.o();
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

    function instance$1($$self, $$props, $$invalidate) {
    	let { post } = $$props;

    	let fpost;
    	let post_object;
    	let fetched_post = false;
    	if (["Announce", "Like"].includes(post.type)) {
    	    if (pubgate_instance == false) {
                $$invalidate('fpost', fpost = fetch(post.object, { headers: {
                    "Accept": "application/activity+json"
                }}).then(d => d.json()));
                $$invalidate('post_object', post_object = fpost => fpost.object);
    	    } else {
    	        $$invalidate('post_object', post_object = post.object);
    	    }

    	    $$invalidate('fetched_post', fetched_post = true);
        }

    	const writable_props = ['post'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key)) console.warn(`<Post> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ('post' in $$props) $$invalidate('post', post = $$props.post);
    	};

    	return { post, post_object, fetched_post };
    }

    class Post extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, ["post"]);

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.post === undefined && !('post' in props)) {
    			console.warn("<Post> was created without expected prop 'post'");
    		}
    	}

    	get post() {
    		throw new Error("<Post>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set post(value) {
    		throw new Error("<Post>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/TimeLine.svelte generated by Svelte v3.4.3 */

    const file$2 = "src/TimeLine.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.post = list[i];
    	return child_ctx;
    }

    // (1:0) <script>     export let active_tab;  import Post from "./Post.svelte"   let pubgate_url_map = {      'local': "/timeline/local?cached=1",      'federated': "/timeline/federated?cached=1"  }
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

    // (18:25)  <ul class="post-list">     {#each value as post}
    function create_then_block(ctx) {
    	var ul, current;

    	var each_value = ctx.value;

    	var each_blocks = [];

    	for (var i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	function outro_block(i, detaching, local) {
    		if (each_blocks[i]) {
    			if (detaching) {
    				on_outro(() => {
    					each_blocks[i].d(detaching);
    					each_blocks[i] = null;
    				});
    			}

    			each_blocks[i].o(local);
    		}
    	}

    	return {
    		c: function create() {
    			ul = element("ul");

    			for (var i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}
    			ul.className = "post-list";
    			add_location(ul, file$2, 18, 0, 456);
    		},

    		m: function mount(target, anchor) {
    			insert(target, ul, anchor);

    			for (var i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}

    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (changed.posts) {
    				each_value = ctx.value;

    				for (var i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(changed, child_ctx);
    						each_blocks[i].i(1);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].i(1);
    						each_blocks[i].m(ul, null);
    					}
    				}

    				group_outros();
    				for (; i < each_blocks.length; i += 1) outro_block(i, 1, 1);
    				check_outros();
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			for (var i = 0; i < each_value.length; i += 1) each_blocks[i].i();

    			current = true;
    		},

    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);
    			for (let i = 0; i < each_blocks.length; i += 1) outro_block(i, 0);

    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(ul);
    			}

    			destroy_each(each_blocks, detaching);
    		}
    	};
    }

    // (20:4) {#each value as post}
    function create_each_block$1(ctx) {
    	var current;

    	var post = new Post({
    		props: { post: ctx.post },
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
    			if (changed.posts) post_changes.post = ctx.post;
    			post.$set(post_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			post.$$.fragment.i(local);

    			current = true;
    		},

    		o: function outro(local) {
    			post.$$.fragment.o(local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			post.$destroy(detaching);
    		}
    	};
    }

    // (1:0) <script>     export let active_tab;  import Post from "./Post.svelte"   let pubgate_url_map = {      'local': "/timeline/local?cached=1",      'federated': "/timeline/federated?cached=1"  }
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

    function create_fragment$2(ctx) {
    	var await_block_anchor, promise, current;

    	let info = {
    		ctx,
    		current: null,
    		pending: create_pending_block,
    		then: create_then_block,
    		catch: create_catch_block,
    		value: 'value',
    		error: 'null',
    		blocks: Array(3)
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
    			info.block.i();
    			current = true;
    		},

    		o: function outro(local) {
    			for (let i = 0; i < 3; i += 1) {
    				const block = info.blocks[i];
    				if (block) block.o();
    			}

    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(await_block_anchor);
    			}

    			info.block.d(detaching);
    			info = null;
    		}
    	};
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { active_tab } = $$props;

    	let pubgate_url_map = {
    	    'local': "/timeline/local?cached=1",
    	    'federated': "/timeline/federated?cached=1"
    	};

    	const fetchTimeline = (isLocal, path) => isLocal
    	?  fetch(base_url + path).then(d => d.json()).then(d => d.first).then(d => d.orderedItems) : [];

    	const writable_props = ['active_tab'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key)) console.warn(`<TimeLine> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ('active_tab' in $$props) $$invalidate('active_tab', active_tab = $$props.active_tab);
    	};

    	let posts;

    	$$self.$$.update = ($$dirty = { pubgate_url_map: 1, active_tab: 1 }) => {
    		if ($$dirty.pubgate_url_map || $$dirty.active_tab) { $$invalidate('posts', posts = fetchTimeline(pubgate_instance, pubgate_url_map[active_tab])); }
    	};

    	return { active_tab, posts };
    }

    class TimeLine extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, ["active_tab"]);

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.active_tab === undefined && !('active_tab' in props)) {
    			console.warn("<TimeLine> was created without expected prop 'active_tab'");
    		}
    	}

    	get active_tab() {
    		throw new Error("<TimeLine>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set active_tab(value) {
    		throw new Error("<TimeLine>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param value initial value
     * @param start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (!stop) {
                    return; // not ready
                }
                subscribers.forEach((s) => s[1]());
                subscribers.forEach((s) => s[0](value));
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
                }
            };
        }
        return { set, update, subscribe };
    }

    /* src/Tab.svelte generated by Svelte v3.4.3 */

    const file$3 = "src/Tab.svelte";

    // (41:0) {:else}
    function create_else_block_1(ctx) {
    	var current;

    	var timeline = new TimeLine({
    		props: { active_tab: ctx.active_tab },
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
    			if (changed.active_tab) timeline_changes.active_tab = ctx.active_tab;
    			timeline.$set(timeline_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			timeline.$$.fragment.i(local);

    			current = true;
    		},

    		o: function outro(local) {
    			timeline.$$.fragment.o(local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			timeline.$destroy(detaching);
    		}
    	};
    }

    // (23:0) {#if active_tab == 'profile'}
    function create_if_block$2(ctx) {
    	var current_block_type_index, if_block, if_block_anchor, current;

    	var if_block_creators = [
    		create_if_block_1$1,
    		create_else_block$2
    	];

    	var if_blocks = [];

    	function select_block_type_1(ctx) {
    		if (ctx.session.user) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type_1(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	return {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},

    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type_1(ctx);
    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(changed, ctx);
    			} else {
    				group_outros();
    				on_outro(() => {
    					if_blocks[previous_block_index].d(1);
    					if_blocks[previous_block_index] = null;
    				});
    				if_block.o(1);
    				check_outros();

    				if_block = if_blocks[current_block_type_index];
    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}
    				if_block.i(1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			if (if_block) if_block.i();
    			current = true;
    		},

    		o: function outro(local) {
    			if (if_block) if_block.o();
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

    // (26:4) {:else}
    function create_else_block$2(ctx) {
    	var form, fieldset0, input0, t0, fieldset1, input1, t1, button, t2, button_disabled_value, dispose;

    	return {
    		c: function create() {
    			form = element("form");
    			fieldset0 = element("fieldset");
    			input0 = element("input");
    			t0 = space();
    			fieldset1 = element("fieldset");
    			input1 = element("input");
    			t1 = space();
    			button = element("button");
    			t2 = text("Sign in");
    			input0.className = "form-control form-control-lg";
    			attr(input0, "type", "username");
    			input0.placeholder = "Username";
    			add_location(input0, file$3, 28, 16, 679);
    			fieldset0.className = "form-group";
    			add_location(fieldset0, file$3, 27, 12, 633);
    			input1.className = "form-control form-control-lg";
    			attr(input1, "type", "password");
    			input1.placeholder = "Password";
    			add_location(input1, file$3, 31, 16, 867);
    			fieldset1.className = "form-group";
    			add_location(fieldset1, file$3, 30, 12, 821);
    			button.className = "btn btn-lg btn-primary pull-xs-right";
    			button.type = "submit";
    			button.disabled = button_disabled_value = !ctx.username || !ctx.password;
    			add_location(button, file$3, 33, 12, 1009);
    			add_location(form, file$3, 26, 8, 580);

    			dispose = [
    				listen(input0, "input", ctx.input0_input_handler),
    				listen(input1, "input", ctx.input1_input_handler),
    				listen(form, "submit", prevent_default(ctx.submit))
    			];
    		},

    		m: function mount(target, anchor) {
    			insert(target, form, anchor);
    			append(form, fieldset0);
    			append(fieldset0, input0);

    			input0.value = ctx.username;

    			append(form, t0);
    			append(form, fieldset1);
    			append(fieldset1, input1);

    			input1.value = ctx.password;

    			append(form, t1);
    			append(form, button);
    			append(button, t2);
    		},

    		p: function update(changed, ctx) {
    			if (changed.username) input0.value = ctx.username;
    			if (changed.password) input1.value = ctx.password;

    			if ((changed.username || changed.password) && button_disabled_value !== (button_disabled_value = !ctx.username || !ctx.password)) {
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

    // (24:4) {#if session.user }
    function create_if_block_1$1(ctx) {
    	var current;

    	var timeline = new TimeLine({
    		props: { active_tab: ctx.active_tab },
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
    			if (changed.active_tab) timeline_changes.active_tab = ctx.active_tab;
    			timeline.$set(timeline_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			timeline.$$.fragment.i(local);

    			current = true;
    		},

    		o: function outro(local) {
    			timeline.$$.fragment.o(local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			timeline.$destroy(detaching);
    		}
    	};
    }

    function create_fragment$3(ctx) {
    	var current_block_type_index, if_block, if_block_anchor, current;

    	var if_block_creators = [
    		create_if_block$2,
    		create_else_block_1
    	];

    	var if_blocks = [];

    	function select_block_type(ctx) {
    		if (ctx.active_tab == 'profile') return 0;
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
    				on_outro(() => {
    					if_blocks[previous_block_index].d(1);
    					if_blocks[previous_block_index] = null;
    				});
    				if_block.o(1);
    				check_outros();

    				if_block = if_blocks[current_block_type_index];
    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}
    				if_block.i(1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			if (if_block) if_block.i();
    			current = true;
    		},

    		o: function outro(local) {
    			if (if_block) if_block.o();
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

    function instance$3($$self, $$props, $$invalidate) {
    	let $session;

    	let { active_tab } = $$props;

    	const session = writable({}); validate_store(session, 'session'); subscribe($$self, session, $$value => { $session = $$value; $$invalidate('$session', $session); });
    	let username = '';
    	let password = '';
    	let errors = null;
    	async function submit(event) {
    		const response = await post(`auth/login`, { email, password });
    		// TODO handle network errors
    		$$invalidate('errors', errors = response.errors);
    		if (response.user) {
    			$session.user = response.user; session.set($session);
    			goto('/');
    		}
    	}

    	const writable_props = ['active_tab'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key)) console.warn(`<Tab> was created with unknown prop '${key}'`);
    	});

    	function input0_input_handler() {
    		username = this.value;
    		$$invalidate('username', username);
    	}

    	function input1_input_handler() {
    		password = this.value;
    		$$invalidate('password', password);
    	}

    	$$self.$set = $$props => {
    		if ('active_tab' in $$props) $$invalidate('active_tab', active_tab = $$props.active_tab);
    	};

    	return {
    		active_tab,
    		session,
    		username,
    		password,
    		submit,
    		input0_input_handler,
    		input1_input_handler
    	};
    }

    class Tab extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, ["active_tab"]);

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.active_tab === undefined && !('active_tab' in props)) {
    			console.warn("<Tab> was created without expected prop 'active_tab'");
    		}
    	}

    	get active_tab() {
    		throw new Error("<Tab>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set active_tab(value) {
    		throw new Error("<Tab>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/App.svelte generated by Svelte v3.4.3 */

    const file$4 = "src/App.svelte";

    // (25:5) {#if pgi == true }
    function create_if_block$3(ctx) {
    	var li0, a0, t_1, li1, a1, dispose;

    	return {
    		c: function create() {
    			li0 = element("li");
    			a0 = element("a");
    			a0.textContent = "Local Timeline";
    			t_1 = space();
    			li1 = element("li");
    			a1 = element("a");
    			a1.textContent = "Federated Timeline";
    			a0.href = "#local";
    			a0.className = "header-selected";
    			add_location(a0, file$4, 25, 6, 588);
    			add_location(li0, file$4, 25, 2, 584);
    			a1.href = "#federated";
    			add_location(a1, file$4, 26, 6, 682);
    			add_location(li1, file$4, 26, 2, 678);

    			dispose = [
    				listen(a0, "click", ctx.selectTab),
    				listen(a1, "click", ctx.selectTab)
    			];
    		},

    		m: function mount(target, anchor) {
    			insert(target, li0, anchor);
    			append(li0, a0);
    			insert(target, t_1, anchor);
    			insert(target, li1, anchor);
    			append(li1, a1);
    		},

    		p: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(li0);
    				detach(t_1);
    				detach(li1);
    			}

    			run_all(dispose);
    		}
    	};
    }

    function create_fragment$4(ctx) {
    	var header, ul, t0, li0, a0, t2, li1, a1, t4, li2, a2, t6, li3, a3, t8, div0, t9, hr, t10, footer, div1, h20, t12, p0, t13, br0, t14, br1, t15, t16, div2, h21, t18, p1, current, dispose;

    	var if_block = (ctx.pgi == true) && create_if_block$3(ctx);

    	var tab = new Tab({
    		props: { active_tab: ctx.active_tab },
    		$$inline: true
    	});

    	return {
    		c: function create() {
    			header = element("header");
    			ul = element("ul");
    			if (if_block) if_block.c();
    			t0 = space();
    			li0 = element("li");
    			a0 = element("a");
    			a0.textContent = "Inbox";
    			t2 = space();
    			li1 = element("li");
    			a1 = element("a");
    			a1.textContent = "Create";
    			t4 = space();
    			li2 = element("li");
    			a2 = element("a");
    			a2.textContent = "...";
    			t6 = space();
    			li3 = element("li");
    			a3 = element("a");
    			a3.textContent = "About";
    			t8 = space();
    			div0 = element("div");
    			tab.$$.fragment.c();
    			t9 = space();
    			hr = element("hr");
    			t10 = space();
    			footer = element("footer");
    			div1 = element("div");
    			h20 = element("h2");
    			h20.textContent = "PubGate-Philip";
    			t12 = space();
    			p0 = element("p");
    			t13 = text("Gotta");
    			br0 = element("br");
    			t14 = text("go");
    			br1 = element("br");
    			t15 = text("Fast");
    			t16 = space();
    			div2 = element("div");
    			h21 = element("h2");
    			h21.textContent = "Contact";
    			t18 = space();
    			p1 = element("p");
    			a0.href = "#inbox";
    			add_location(a0, file$4, 28, 6, 768);
    			add_location(li0, file$4, 28, 2, 764);
    			a1.href = "#create";
    			add_location(a1, file$4, 29, 6, 829);
    			add_location(li1, file$4, 29, 2, 825);
    			a2.href = "#profile";
    			add_location(a2, file$4, 30, 6, 892);
    			add_location(li2, file$4, 30, 2, 888);
    			a3.href = "#about";
    			add_location(a3, file$4, 31, 6, 953);
    			add_location(li3, file$4, 31, 2, 949);
    			add_location(ul, file$4, 23, 1, 553);
    			add_location(header, file$4, 22, 0, 543);
    			div0.className = "content";
    			add_location(div0, file$4, 35, 0, 1026);
    			hr.className = "separator";
    			add_location(hr, file$4, 39, 0, 1092);
    			add_location(h20, file$4, 42, 8, 1180);
    			add_location(br0, file$4, 43, 16, 1220);
    			add_location(br1, file$4, 43, 22, 1226);
    			add_location(p0, file$4, 43, 8, 1212);
    			div1.className = "left-column";
    			add_location(div1, file$4, 41, 4, 1146);
    			add_location(h21, file$4, 46, 8, 1289);
    			add_location(p1, file$4, 47, 8, 1314);
    			div2.className = "right-column";
    			add_location(div2, file$4, 45, 4, 1254);
    			footer.className = "content";
    			add_location(footer, file$4, 40, 0, 1117);

    			dispose = [
    				listen(a0, "click", ctx.selectTab),
    				listen(a1, "click", ctx.selectTab),
    				listen(a2, "click", ctx.selectTab),
    				listen(a3, "click", ctx.selectTab)
    			];
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert(target, header, anchor);
    			append(header, ul);
    			if (if_block) if_block.m(ul, null);
    			append(ul, t0);
    			append(ul, li0);
    			append(li0, a0);
    			append(ul, t2);
    			append(ul, li1);
    			append(li1, a1);
    			append(ul, t4);
    			append(ul, li2);
    			append(li2, a2);
    			append(ul, t6);
    			append(ul, li3);
    			append(li3, a3);
    			insert(target, t8, anchor);
    			insert(target, div0, anchor);
    			mount_component(tab, div0, null);
    			insert(target, t9, anchor);
    			insert(target, hr, anchor);
    			insert(target, t10, anchor);
    			insert(target, footer, anchor);
    			append(footer, div1);
    			append(div1, h20);
    			append(div1, t12);
    			append(div1, p0);
    			append(p0, t13);
    			append(p0, br0);
    			append(p0, t14);
    			append(p0, br1);
    			append(p0, t15);
    			append(footer, t16);
    			append(footer, div2);
    			append(div2, h21);
    			append(div2, t18);
    			append(div2, p1);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (ctx.pgi == true) {
    				if (if_block) {
    					if_block.p(changed, ctx);
    				} else {
    					if_block = create_if_block$3(ctx);
    					if_block.c();
    					if_block.m(ul, t0);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			var tab_changes = {};
    			if (changed.active_tab) tab_changes.active_tab = ctx.active_tab;
    			tab.$set(tab_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			tab.$$.fragment.i(local);

    			current = true;
    		},

    		o: function outro(local) {
    			tab.$$.fragment.o(local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(header);
    			}

    			if (if_block) if_block.d();

    			if (detaching) {
    				detach(t8);
    				detach(div0);
    			}

    			tab.$destroy();

    			if (detaching) {
    				detach(t9);
    				detach(hr);
    				detach(t10);
    				detach(footer);
    			}

    			run_all(dispose);
    		}
    	};
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let active_tab = 'local';
        let pgi = pubgate_instance;

        function selectTab (event) {
            event.preventDefault();
            $$invalidate('active_tab', active_tab = this.href.split('#')[1]);
            Array.prototype.forEach.call(this.parentNode.parentNode.children, (el, i) => {
                if (el.firstChild.href.split('#')[1] !== active_tab) {
                    el.firstChild.classList.remove('header-selected');
                }
            });
            this.classList.add('header-selected');
        }

    	return { active_tab, pgi, selectTab };
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, []);
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map