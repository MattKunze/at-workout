import { PassThrough } from "node:stream";
import { createReadableStreamFromReadable } from "@react-router/node";
import { renderToPipeableStream } from "react-dom/server";
import { Link, Links, Meta, Outlet, Scripts, ScrollRestoration, ServerRouter, UNSAFE_withComponentProps } from "react-router";
import { isbot } from "isbot";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Bars3Icon, BellIcon, UserCircleIcon } from "@heroicons/react/24/outline";
var __defProp = Object.defineProperty;
var __export = (all) => {
	let target = {};
	for (var name in all) __defProp(target, name, {
		get: all[name],
		enumerable: true
	});
	return target;
};
var entry_server_exports = /* @__PURE__ */ __export({ default: () => handleRequest });
function handleRequest(request, responseStatusCode, responseHeaders, routerContext, loadContext) {
	return new Promise((resolve, reject) => {
		let shellRendered = false;
		let userAgent = request.headers.get("user-agent");
		const readyOption = userAgent && isbot(userAgent) ? "onAllReady" : "onShellReady";
		const { pipe, abort } = renderToPipeableStream(/* @__PURE__ */ jsx(ServerRouter, {
			context: routerContext,
			url: request.url
		}), {
			[readyOption]() {
				shellRendered = true;
				const body = new PassThrough();
				const stream = createReadableStreamFromReadable(body);
				responseHeaders.set("Content-Type", "text/html");
				resolve(new Response(stream, {
					headers: responseHeaders,
					status: responseStatusCode
				}));
				pipe(body);
			},
			onShellError(error) {
				reject(error);
			},
			onError(error) {
				responseStatusCode = 500;
				if (shellRendered) console.error(error);
			}
		});
		setTimeout(abort, 5e3);
	});
}
var root_exports = /* @__PURE__ */ __export({ default: () => root_default });
var root_default = UNSAFE_withComponentProps(function App() {
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	return /* @__PURE__ */ jsxs("html", {
		lang: "en",
		children: [/* @__PURE__ */ jsxs("head", { children: [
			/* @__PURE__ */ jsx("meta", { charSet: "utf-8" }),
			/* @__PURE__ */ jsx("meta", {
				name: "viewport",
				content: "width=device-width, initial-scale=1"
			}),
			/* @__PURE__ */ jsx(Meta, {}),
			/* @__PURE__ */ jsx(Links, {})
		] }), /* @__PURE__ */ jsxs("body", { children: [
			/* @__PURE__ */ jsxs("div", {
				className: "min-h-screen bg-base-100 flex flex-col",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "navbar bg-base-100 shadow-md",
					children: [/* @__PURE__ */ jsx("div", {
						className: "flex-1",
						children: /* @__PURE__ */ jsx(Link, {
							to: "/",
							className: "btn btn-ghost text-xl",
							children: "Parking App"
						})
					}), /* @__PURE__ */ jsxs("div", {
						className: "flex-none gap-2",
						children: [
							/* @__PURE__ */ jsx("button", {
								className: "btn btn-ghost btn-circle",
								children: /* @__PURE__ */ jsx(BellIcon, { className: "h-6 w-6" })
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "dropdown dropdown-end",
								children: [/* @__PURE__ */ jsx("div", {
									tabIndex: 0,
									role: "button",
									className: "btn btn-ghost btn-circle avatar",
									children: /* @__PURE__ */ jsx("div", {
										className: "w-10 rounded-full",
										children: /* @__PURE__ */ jsx(UserCircleIcon, { className: "h-full w-full" })
									})
								}), /* @__PURE__ */ jsxs("ul", {
									tabIndex: 0,
									className: "mt-3 z-[1] p-2 shadow menu menu-sm dropdown-content bg-base-100 rounded-box w-52",
									children: [
										/* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(Link, {
											to: "/preferences",
											children: "Profile"
										}) }),
										/* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(Link, {
											to: "/preferences",
											children: "Settings"
										}) }),
										/* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx("a", { children: "Logout" }) })
									]
								})]
							}),
							/* @__PURE__ */ jsx("button", {
								className: "btn btn-ghost lg:hidden",
								onClick: () => setIsMenuOpen(!isMenuOpen),
								children: /* @__PURE__ */ jsx(Bars3Icon, { className: "h-6 w-6" })
							})
						]
					})]
				}), /* @__PURE__ */ jsxs("div", {
					className: "flex flex-grow relative",
					children: [/* @__PURE__ */ jsx("div", {
						className: "flex-1 container mx-auto p-6",
						children: /* @__PURE__ */ jsx(Outlet, {})
					}), /* @__PURE__ */ jsxs("div", {
						className: "hidden lg:block w-80 bg-base-200 p-4 border-l border-base-300",
						children: [
							/* @__PURE__ */ jsx("h2", {
								className: "text-xl font-semibold mb-4",
								children: "Quick Actions"
							}),
							/* @__PURE__ */ jsxs("ul", {
								className: "menu bg-base-100 w-full rounded-box",
								children: [
									/* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx("a", { children: "Add Reservation" }) }),
									/* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx("a", { children: "View Reports" }) }),
									/* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx("a", { children: "Manage Users" }) })
								]
							}),
							/* @__PURE__ */ jsx("div", { className: "divider" }),
							/* @__PURE__ */ jsx("h2", {
								className: "text-xl font-semibold mb-4",
								children: "Notifications"
							}),
							/* @__PURE__ */ jsx("div", {
								className: "alert alert-info text-sm mb-2",
								children: /* @__PURE__ */ jsx("span", { children: "New booking for Spot A1." })
							})
						]
					})]
				})]
			}),
			/* @__PURE__ */ jsx(ScrollRestoration, {}),
			/* @__PURE__ */ jsx(Scripts, {})
		] })]
	});
});
var preferences_exports = /* @__PURE__ */ __export({ default: () => preferences_default });
var preferences_default = UNSAFE_withComponentProps(function Preferences() {
	return /* @__PURE__ */ jsxs("div", {
		className: "prose",
		children: [
			/* @__PURE__ */ jsx("h1", { children: "User Preferences" }),
			/* @__PURE__ */ jsx("p", { children: "This is a placeholder for user preferences." }),
			/* @__PURE__ */ jsx("div", {
				className: "form-control",
				children: /* @__PURE__ */ jsxs("label", {
					className: "label cursor-pointer",
					children: [/* @__PURE__ */ jsx("span", {
						className: "label-text",
						children: "Enable Notifications"
					}), /* @__PURE__ */ jsx("input", {
						type: "checkbox",
						className: "toggle",
						defaultChecked: true
					})]
				})
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "form-control w-full max-w-xs",
				children: [/* @__PURE__ */ jsx("label", {
					className: "label",
					children: /* @__PURE__ */ jsx("span", {
						className: "label-text",
						children: "Theme"
					})
				}), /* @__PURE__ */ jsxs("select", {
					className: "select select-bordered",
					defaultValue: "System",
					children: [
						/* @__PURE__ */ jsx("option", {
							disabled: true,
							children: "Pick one"
						}),
						/* @__PURE__ */ jsx("option", { children: "Light" }),
						/* @__PURE__ */ jsx("option", { children: "Dark" }),
						/* @__PURE__ */ jsx("option", { children: "System" })
					]
				})]
			})
		]
	});
});
var _index_exports = /* @__PURE__ */ __export({ default: () => _index_default });
var _index_default = UNSAFE_withComponentProps(function Dashboard() {
	return /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("h1", {
		className: "text-3xl font-bold mb-4",
		children: "Dashboard"
	}), /* @__PURE__ */ jsxs("div", {
		className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6",
		children: [
			/* @__PURE__ */ jsx("div", {
				className: "card bg-base-200 shadow-xl",
				children: /* @__PURE__ */ jsxs("div", {
					className: "card-body",
					children: [
						/* @__PURE__ */ jsx("h2", {
							className: "card-title",
							children: "Parking Spot A1"
						}),
						/* @__PURE__ */ jsx("p", { children: "Status: Occupied" }),
						/* @__PURE__ */ jsx("div", {
							className: "card-actions justify-end",
							children: /* @__PURE__ */ jsx("button", {
								className: "btn btn-primary btn-sm",
								children: "View"
							})
						})
					]
				})
			}),
			/* @__PURE__ */ jsx("div", {
				className: "card bg-base-200 shadow-xl",
				children: /* @__PURE__ */ jsxs("div", {
					className: "card-body",
					children: [
						/* @__PURE__ */ jsx("h2", {
							className: "card-title",
							children: "Parking Spot A2"
						}),
						/* @__PURE__ */ jsx("p", { children: "Status: Available" }),
						/* @__PURE__ */ jsx("div", {
							className: "card-actions justify-end",
							children: /* @__PURE__ */ jsx("button", {
								className: "btn btn-success btn-sm",
								children: "Reserve"
							})
						})
					]
				})
			}),
			/* @__PURE__ */ jsx("div", {
				className: "card bg-base-200 shadow-xl",
				children: /* @__PURE__ */ jsxs("div", {
					className: "card-body",
					children: [
						/* @__PURE__ */ jsx("h2", {
							className: "card-title",
							children: "Revenue"
						}),
						/* @__PURE__ */ jsx("p", { children: "Today: $120.00" }),
						/* @__PURE__ */ jsx("div", {
							className: "card-actions justify-end",
							children: /* @__PURE__ */ jsx("button", {
								className: "btn btn-ghost btn-sm",
								children: "Details"
							})
						})
					]
				})
			})
		]
	})] });
});
var server_manifest_default = {
	"entry": {
		"module": "/assets/entry.client-CqQXoB4-.js",
		"imports": ["/assets/jsx-runtime-B46UGb7t.js"],
		"css": []
	},
	"routes": {
		"root": {
			"id": "root",
			"parentId": void 0,
			"path": "",
			"index": void 0,
			"caseSensitive": void 0,
			"hasAction": false,
			"hasLoader": false,
			"hasClientAction": false,
			"hasClientLoader": false,
			"hasClientMiddleware": false,
			"hasErrorBoundary": false,
			"module": "/assets/root-BPo9hcOF.js",
			"imports": ["/assets/jsx-runtime-B46UGb7t.js"],
			"css": ["/assets/root-I27czD9p.css"],
			"clientActionModule": void 0,
			"clientLoaderModule": void 0,
			"clientMiddlewareModule": void 0,
			"hydrateFallbackModule": void 0
		},
		"routes/preferences": {
			"id": "routes/preferences",
			"parentId": "root",
			"path": "preferences",
			"index": void 0,
			"caseSensitive": void 0,
			"hasAction": false,
			"hasLoader": false,
			"hasClientAction": false,
			"hasClientLoader": false,
			"hasClientMiddleware": false,
			"hasErrorBoundary": false,
			"module": "/assets/preferences-Bsm4Te8H.js",
			"imports": ["/assets/jsx-runtime-B46UGb7t.js"],
			"css": [],
			"clientActionModule": void 0,
			"clientLoaderModule": void 0,
			"clientMiddlewareModule": void 0,
			"hydrateFallbackModule": void 0
		},
		"routes/_index": {
			"id": "routes/_index",
			"parentId": "root",
			"path": void 0,
			"index": true,
			"caseSensitive": void 0,
			"hasAction": false,
			"hasLoader": false,
			"hasClientAction": false,
			"hasClientLoader": false,
			"hasClientMiddleware": false,
			"hasErrorBoundary": false,
			"module": "/assets/_index-BW49NTs8.js",
			"imports": ["/assets/jsx-runtime-B46UGb7t.js"],
			"css": [],
			"clientActionModule": void 0,
			"clientLoaderModule": void 0,
			"clientMiddlewareModule": void 0,
			"hydrateFallbackModule": void 0
		}
	},
	"url": "/assets/manifest-db7b39e4.js",
	"version": "db7b39e4",
	"sri": void 0
};
const assetsBuildDirectory = "build/client";
const basename = "/";
const future = {
	"unstable_optimizeDeps": false,
	"unstable_subResourceIntegrity": false,
	"v8_middleware": false,
	"v8_splitRouteModules": false,
	"v8_viteEnvironmentApi": false
};
const ssr = true;
const isSpaMode = false;
const prerender = [];
const routeDiscovery = {
	"mode": "lazy",
	"manifestPath": "/__manifest"
};
const publicPath = "/";
const entry = { module: entry_server_exports };
const routes = {
	"root": {
		id: "root",
		parentId: void 0,
		path: "",
		index: void 0,
		caseSensitive: void 0,
		module: root_exports
	},
	"routes/preferences": {
		id: "routes/preferences",
		parentId: "root",
		path: "preferences",
		index: void 0,
		caseSensitive: void 0,
		module: preferences_exports
	},
	"routes/_index": {
		id: "routes/_index",
		parentId: "root",
		path: void 0,
		index: true,
		caseSensitive: void 0,
		module: _index_exports
	}
};
export { server_manifest_default as assets, assetsBuildDirectory, basename, entry, future, isSpaMode, prerender, publicPath, routeDiscovery, routes, ssr };
