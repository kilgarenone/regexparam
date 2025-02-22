import { test } from "uvu";
import * as assert from "uvu/assert";
import { parse } from "../src";

const hasNamedGroups = "groups" in /x/.exec("x");

function run(route, url, loose) {
	let i = 0,
		out = {},
		result = parse(route, !!loose);
	let matches = result.pattern.exec(url);
	if (matches === null) return false;
	if (matches.groups) return matches.groups;
	while (i < result.keys.length) {
		out[result.keys[i]] = matches[++i] || null;
	}
	return out;
}

function raw(route, url, loose) {
	return parse(route, !!loose).pattern.exec(url);
}

function toExec(route, url, params) {
	let out = run(route, url);
	if (out && params) out = { ...out }; // convert null proto
	assert.equal(
		out,
		params,
		out
			? `~> parsed "${url}" into correct params`
			: `~> route and "${url}" did not match`
	);
}

function toLooseExec(route, url, params) {
	let out = run(route, url, true);
	if (out && params) out = { ...out }; // convert null proto
	assert.equal(
		out,
		params,
		out
			? `~> parsed "${url}" into correct params`
			: `~> route and "${url}" did not match`
	);
}

// ---

test("exports", () => {
	assert.type(parse, "function");
});

test("returns :: string", () => {
	let output = parse("/");
	assert.type(output, "object");
	assert.instance(output.pattern, RegExp);
	assert.instance(output.keys, Array);
});

test("ensure lead slash", () => {
	assert.equal(parse("/"), parse(""), "~> root");
	assert.equal(parse("/books"), parse("books"), "~> static");
	assert.equal(parse("/books/:title"), parse("books/:title"), "~> param");
	assert.equal(parse("/books/:title?"), parse("books/:title?"), "~> optional");
	assert.equal(parse("/books/*"), parse("books/*"), "~> wildcard");
});

test("static", () => {
	let { keys, pattern } = parse("/books");
	assert.equal(keys, [], "~> empty keys");
	assert.ok(pattern.test("/books"), "~> matches route");
	assert.ok(pattern.test("/books/"), "~> matches trailing slash");
	assert.not.ok(pattern.test("/books/author"), "~> does not match extra bits");
	assert.not.ok(
		pattern.test("books"),
		"~> does not match path without lead slash"
	);
});

test("static :: multiple", () => {
	let { keys, pattern } = parse("/foo/bar");
	assert.equal(keys, [], "~> empty keys");
	assert.ok(pattern.test("/foo/bar"), "~> matches route");
	assert.ok(pattern.test("/foo/bar/"), "~> matches trailing slash");
	assert.not.ok(pattern.test("/foo/bar/baz"), "~> does not match extra bits");
	assert.not.ok(
		pattern.test("foo/bar"),
		"~> does not match path without lead slash"
	);
});

test("param", () => {
	let { keys, pattern } = parse("/books/:title");
	assert.equal(keys, ["title"], '~> keys has "title" value');
	assert.not.ok(pattern.test("/books"), "~> does not match naked base");
	assert.not.ok(
		pattern.test("/books/"),
		"~> does not match naked base w/ trailing slash"
	);
	assert.ok(pattern.test("/books/narnia"), "~> matches definition");
	assert.ok(
		pattern.test("/books/narnia/"),
		"~> matches definition w/ trailing slash"
	);
	assert.not.ok(
		pattern.test("/books/narnia/hello"),
		"~> does not match extra bits"
	);
	assert.not.ok(
		pattern.test("books/narnia"),
		"~> does not match path without lead slash"
	);
	let [url, value] = pattern.exec("/books/narnia");
	assert.is(url, "/books/narnia", "~> executing pattern on correct trimming");
	assert.is(value, "narnia", "~> executing pattern gives correct value");
});

test("param :: static :: none", () => {
	let { keys, pattern } = parse("/:title");
	assert.equal(keys, ["title"], '~> keys has "title" value');
	assert.not.ok(
		pattern.test("/"),
		"~> does not match naked base w/ trailing slash"
	);
	assert.ok(pattern.test("/narnia"), "~> matches definition");
	assert.ok(
		pattern.test("/narnia/"),
		"~> matches definition w/ trailing slash"
	);
	assert.not.ok(
		pattern.test("/narnia/reviews"),
		"~> does not match extra bits"
	);
	assert.not.ok(
		pattern.test("narnia"),
		"~> does not match path without lead slash"
	);
	let [url, value] = pattern.exec("/narnia/");
	assert.is(url, "/narnia/", "~> executing pattern on correct trimming");
	assert.is(value, "narnia", "~> executing pattern gives correct value");
});

test("param :: static :: multiple", () => {
	let { keys, pattern } = parse("/foo/bar/:title");
	assert.equal(keys, ["title"], '~> keys has "title" value');
	assert.not.ok(pattern.test("/foo/bar"), "~> does not match naked base");
	assert.not.ok(
		pattern.test("/foo/bar/"),
		"~> does not match naked base w/ trailing slash"
	);
	assert.ok(pattern.test("/foo/bar/narnia"), "~> matches definition");
	assert.ok(
		pattern.test("/foo/bar/narnia/"),
		"~> matches definition w/ trailing slash"
	);
	assert.not.ok(
		pattern.test("/foo/bar/narnia/hello"),
		"~> does not match extra bits"
	);
	assert.not.ok(
		pattern.test("foo/bar/narnia"),
		"~> does not match path without lead slash"
	);
	assert.not.ok(
		pattern.test("/foo/narnia"),
		"~> does not match if statics are different"
	);
	assert.not.ok(
		pattern.test("/bar/narnia"),
		"~> does not match if statics are different"
	);
	let [url, value] = pattern.exec("/foo/bar/narnia");
	assert.is(url, "/foo/bar/narnia", "~> executing pattern on correct trimming");
	assert.is(value, "narnia", "~> executing pattern gives correct value");
});

test("param :: multiple", () => {
	let { keys, pattern } = parse("/books/:author/:title");
	assert.equal(
		keys,
		["author", "title"],
		'~> keys has "author" & "title" values'
	);
	assert.not.ok(pattern.test("/books"), "~> does not match naked base");
	assert.not.ok(
		pattern.test("/books/"),
		"~> does not match naked base w/ trailing slash"
	);
	assert.not.ok(
		pattern.test("/books/smith"),
		"~> does not match insufficient parameter counts"
	);
	assert.not.ok(
		pattern.test("/books/smith/"),
		"~> does not match insufficient paramters w/ trailing slash"
	);
	assert.ok(pattern.test("/books/smith/narnia"), "~> matches definition");
	assert.ok(
		pattern.test("/books/smith/narnia/"),
		"~> matches definition w/ trailing slash"
	);
	assert.not.ok(
		pattern.test("/books/smith/narnia/reviews"),
		"~> does not match extra bits"
	);
	assert.not.ok(
		pattern.test("books/smith/narnia"),
		"~> does not match path without lead slash"
	);
	let [url, author, title] = pattern.exec("/books/smith/narnia");
	assert.is(
		url,
		"/books/smith/narnia",
		"~> executing pattern on correct trimming"
	);
	assert.is(author, "smith", "~> executing pattern gives correct value");
	assert.is(title, "narnia", "~> executing pattern gives correct value");
});

test("param :: suffix", () => {
	let { keys, pattern } = parse("/movies/:title.mp4");
	assert.equal(keys, ["title"], '~> keys has "title" only (no suffix)');
	assert.not.ok(pattern.test("/movies"), "~> does not match naked base");
	assert.not.ok(
		pattern.test("/movies/"),
		"~> does not match naked base w/ trailing slash"
	);
	assert.not.ok(
		pattern.test("/movies/foo"),
		"~> does not match without suffix"
	);
	assert.not.ok(
		pattern.test("/movies/foo.mp3"),
		"~> does not match with wrong suffix"
	);
	assert.ok(
		pattern.test("/movies/foo.mp4"),
		"~> does match with correct suffix"
	);
	assert.ok(
		pattern.test("/movies/foo.mp4/"),
		"~> does match with trailing slash"
	);
});

test("param :: suffices", () => {
	let { keys, pattern } = parse("/movies/:title.(mp4|mov)");
	assert.equal(keys, ["title"], '~> keys has "title" only (no suffix)');
	assert.not.ok(pattern.test("/movies"), "~> does not match naked base");
	assert.not.ok(
		pattern.test("/movies/"),
		"~> does not match naked base w/ trailing slash"
	);
	assert.not.ok(
		pattern.test("/movies/foo"),
		"~> does not match without suffix"
	);
	assert.not.ok(
		pattern.test("/movies/foo.mp3"),
		"~> does not match with wrong suffix"
	);
	assert.ok(
		pattern.test("/movies/foo.mp4"),
		"~> does match with correct suffix (mp4)"
	);
	assert.ok(
		pattern.test("/movies/foo.mp4/"),
		"~> does match with trailing slash (mp4)"
	);
	assert.ok(
		pattern.test("/movies/foo.mov"),
		"~> does match with correct suffix (mov)"
	);
	assert.ok(
		pattern.test("/movies/foo.mov/"),
		"~> does match with trailing slash (mov)"
	);
});

test("param :: optional", () => {
	let { keys, pattern } = parse("/books/:author/:title?");
	assert.equal(
		keys,
		["author", "title"],
		'~> keys has "author" & "title" values'
	);
	assert.not.ok(pattern.test("/books"), "~> does not match naked base");
	assert.not.ok(
		pattern.test("/books/"),
		"~> does not match naked base w/ trailing slash"
	);
	assert.ok(
		pattern.test("/books/smith"),
		"~> matches when optional parameter is missing counts"
	);
	assert.ok(
		pattern.test("/books/smith/"),
		"~> matches when optional paramter is missing w/ trailing slash"
	);
	assert.ok(
		pattern.test("/books/smith/narnia"),
		"~> matches when fully populated"
	);
	assert.ok(
		pattern.test("/books/smith/narnia/"),
		"~> matches when fully populated w/ trailing slash"
	);
	assert.not.ok(
		pattern.test("/books/smith/narnia/reviews"),
		"~> does not match extra bits"
	);
	assert.not.ok(
		pattern.test("books/smith/narnia"),
		"~> does not match path without lead slash"
	);
	let [_, author, title] = pattern.exec("/books/smith/narnia");
	assert.is(author, "smith", "~> executing pattern gives correct value");
	assert.is(title, "narnia", "~> executing pattern gives correct value");
});

test("param :: optional :: static :: none", () => {
	let { keys, pattern } = parse("/:title?");
	assert.equal(keys, ["title"], '~> keys has "title" value');
	assert.ok(pattern.test("/"), "~> matches root w/ trailing slash");
	assert.ok(pattern.test("/narnia"), "~> matches definition");
	assert.ok(
		pattern.test("/narnia/"),
		"~> matches definition w/ trailing slash"
	);
	assert.not.ok(
		pattern.test("/narnia/reviews"),
		"~> does not match extra bits"
	);
	assert.not.ok(
		pattern.test("narnia"),
		"~> does not match path without lead slash"
	);
	let [_, value] = pattern.exec("/narnia");
	assert.is(value, "narnia", "~> executing pattern gives correct value");
});

test("param :: optional :: multiple", () => {
	let { keys, pattern } = parse("/books/:genre/:author?/:title?");
	assert.equal(
		keys,
		["genre", "author", "title"],
		'~> keys has "genre", "author" & "title" values'
	);
	assert.not.ok(pattern.test("/books"), "~> does not match naked base");
	assert.not.ok(
		pattern.test("/books/"),
		"~> does not match naked base w/ trailing slash"
	);
	assert.ok(
		pattern.test("/books/horror"),
		"~> matches when optional parameter is missing counts"
	);
	assert.ok(
		pattern.test("/books/horror/"),
		"~> matches when optional paramter is missing w/ trailing slash"
	);
	assert.ok(
		pattern.test("/books/horror/smith"),
		"~> matches when optional parameter is missing counts"
	);
	assert.ok(
		pattern.test("/books/horror/smith/"),
		"~> matches when optional paramter is missing w/ trailing slash"
	);
	assert.ok(
		pattern.test("/books/horror/smith/narnia"),
		"~> matches when fully populated"
	);
	assert.ok(
		pattern.test("/books/horror/smith/narnia/"),
		"~> matches when fully populated w/ trailing slash"
	);
	assert.not.ok(
		pattern.test("/books/horror/smith/narnia/reviews"),
		"~> does not match extra bits"
	);
	assert.not.ok(
		pattern.test("books/horror/smith/narnia"),
		"~> does not match path without lead slash"
	);
	let [_, genre, author, title] = pattern.exec("/books/horror/smith/narnia");
	assert.is(genre, "horror", "~> executing pattern gives correct value");
	assert.is(author, "smith", "~> executing pattern gives correct value");
	assert.is(title, "narnia", "~> executing pattern gives correct value");
});

test("wildcard", () => {
	let { keys, pattern } = parse("/books/*");
	assert.equal(keys, ["wild"], '~> keys has "wild" value');
	assert.not.ok(pattern.test("/books"), "~> does not match naked base");
	assert.ok(
		pattern.test("/books/"),
		"~> does not match naked base w/ trailing slash"
	);
	assert.ok(pattern.test("/books/narnia"), "~> matches definition");
	assert.ok(
		pattern.test("/books/narnia/"),
		"~> matches definition w/ trailing slash"
	);
	assert.ok(
		pattern.test("/books/narnia/reviews"),
		"~> does not match extra bits"
	);
	assert.not.ok(
		pattern.test("books/narnia"),
		"~> does not match path without lead slash"
	);
	let [_, value] = pattern.exec("/books/narnia/reviews");
	assert.is(
		value,
		"narnia/reviews",
		"~> executing pattern gives ALL values after base"
	);
});

test("wildcard :: root", () => {
	let { keys, pattern } = parse("*");
	assert.equal(keys, ["wild"], '~> keys has "wild" value');
	assert.ok(pattern.test("/"), "~> matches root path");
	assert.ok(pattern.test("/narnia"), "~> matches definition");
	assert.ok(
		pattern.test("/narnia/"),
		"~> matches definition w/ trailing slash"
	);
	assert.ok(pattern.test("/narnia/reviews"), "~> does not match extra bits");
	assert.not.ok(
		pattern.test("narnia"),
		"~> does not match path without lead slash"
	);
	let [_, value] = pattern.exec("/foo/bar/baz");
	assert.is(
		value,
		"foo/bar/baz",
		"~> executing pattern gives ALL values together"
	);
});

test("execs", () => {
	// false = did not match

	// console.log('/books');
	toExec("/books", "/", false);
	toExec("/books", "/books", {});
	toExec("/books", "/books/", {});
	toExec("/books", "/books/world/", false);
	toExec("/books", "/books/world", false);

	// console.log('/:title');
	toExec("/:title", "/hello", { title: "hello" });
	toExec("/:title", "/hello/", { title: "hello" });
	toExec("/:title", "/hello/world/", false);
	toExec("/:title", "/hello/world", false);
	toExec("/:title", "/", false);

	// console.log('/:title?');
	toExec("/:title?", "/", { title: null });
	toExec("/:title?", "/hello", { title: "hello" });
	toExec("/:title?", "/hello/", { title: "hello" });
	toExec("/:title?", "/hello/world/", false);
	toExec("/:title?", "/hello/world", false);

	// console.log('/:title.mp4');
	toExec("/:title.mp4", "/hello.mp4", { title: "hello" });
	toExec("/:title.mp4", "/hello.mp4/", { title: "hello" });
	toExec("/:title.mp4", "/hello.mp4/history/", false);
	toExec("/:title.mp4", "/hello.mp4/history", false);
	toExec("/:title.mp4", "/", false);

	// console.log('/:title/:genre');
	toExec("/:title/:genre", "/hello/world", { title: "hello", genre: "world" });
	toExec("/:title/:genre", "/hello/world/", { title: "hello", genre: "world" });
	toExec("/:title/:genre", "/hello/world/mundo/", false);
	toExec("/:title/:genre", "/hello/world/mundo", false);
	toExec("/:title/:genre", "/hello/", false);
	toExec("/:title/:genre", "/hello", false);

	// console.log('/:title/:genre?');
	toExec("/:title/:genre?", "/hello", { title: "hello", genre: null });
	toExec("/:title/:genre?", "/hello/", { title: "hello", genre: null });
	toExec("/:title/:genre?", "/hello/world", { title: "hello", genre: "world" });
	toExec("/:title/:genre?", "/hello/world/", {
		title: "hello",
		genre: "world",
	});
	toExec("/:title/:genre?", "/hello/world/mundo/", false);
	toExec("/:title/:genre?", "/hello/world/mundo", false);

	// console.log('/books/*');
	toExec("/books/*", "/books", false);
	toExec("/books/*", "/books/", { wild: null });
	toExec("/books/*", "/books/world", { wild: "world" });
	toExec("/books/*", "/books/world/", { wild: "world/" });
	toExec("/books/*", "/books/world/howdy", { wild: "world/howdy" });
	toExec("/books/*", "/books/world/howdy/", { wild: "world/howdy/" });

	// console.log('/books/*?');
	toExec("/books/*?", "/books", false);
	toExec("/books/*?", "/books/", { wild: null });
	toExec("/books/*?", "/books/world", { wild: "world" });
	toExec("/books/*?", "/books/world/", { wild: "world/" });
	toExec("/books/*?", "/books/world/howdy", { wild: "world/howdy" });
	toExec("/books/*?", "/books/world/howdy/", { wild: "world/howdy/" });
});

test("execs :: loose", () => {
	// false = did not match

	// console.log('/books');
	toLooseExec("/books", "/", false);
	toLooseExec("/books", "/books", {});
	toLooseExec("/books", "/books/", {});
	toLooseExec("/books", "/books/world/", {});
	toLooseExec("/books", "/books/world", {});

	// console.log('/:title');
	toLooseExec("/:title", "/hello", { title: "hello" });
	toLooseExec("/:title", "/hello/", { title: "hello" });
	toLooseExec("/:title", "/hello/world/", { title: "hello" });
	toLooseExec("/:title", "/hello/world", { title: "hello" });
	toLooseExec("/:title", "/", false);

	// console.log('/:title?');
	toLooseExec("/:title?", "/", { title: null });
	toLooseExec("/:title?", "/hello", { title: "hello" });
	toLooseExec("/:title?", "/hello/", { title: "hello" });
	toLooseExec("/:title?", "/hello/world/", { title: "hello" });
	toLooseExec("/:title?", "/hello/world", { title: "hello" });

	// console.log('/:title.mp4');
	toLooseExec("/:title.mp4", "/hello.mp4", { title: "hello" });
	toLooseExec("/:title.mp4", "/hello.mp4/", { title: "hello" });
	toLooseExec("/:title.mp4", "/hello.mp4/history/", { title: "hello" });
	toLooseExec("/:title.mp4", "/hello.mp4/history", { title: "hello" });
	toLooseExec("/:title.mp4", "/", false);

	// console.log('/:title/:genre');
	toLooseExec("/:title/:genre", "/hello/world", {
		title: "hello",
		genre: "world",
	});
	toLooseExec("/:title/:genre", "/hello/world/", {
		title: "hello",
		genre: "world",
	});
	toLooseExec("/:title/:genre", "/hello/world/mundo/", {
		title: "hello",
		genre: "world",
	});
	toLooseExec("/:title/:genre", "/hello/world/mundo", {
		title: "hello",
		genre: "world",
	});
	toLooseExec("/:title/:genre", "/hello/", false);
	toLooseExec("/:title/:genre", "/hello", false);

	// console.log('/:title/:genre?');
	toLooseExec("/:title/:genre?", "/hello", { title: "hello", genre: null });
	toLooseExec("/:title/:genre?", "/hello/", { title: "hello", genre: null });
	toLooseExec("/:title/:genre?", "/hello/world", {
		title: "hello",
		genre: "world",
	});
	toLooseExec("/:title/:genre?", "/hello/world/", {
		title: "hello",
		genre: "world",
	});
	toLooseExec("/:title/:genre?", "/hello/world/mundo/", {
		title: "hello",
		genre: "world",
	});
	toLooseExec("/:title/:genre?", "/hello/world/mundo", {
		title: "hello",
		genre: "world",
	});

	// console.log('/books/*');
	toLooseExec("/books/*", "/books", false);
	toLooseExec("/books/*", "/books/", { wild: null });
	toLooseExec("/books/*", "/books/world", { wild: "world" });
	toLooseExec("/books/*", "/books/world/", { wild: "world/" });
	toLooseExec("/books/*", "/books/world/howdy", { wild: "world/howdy" });
	toLooseExec("/books/*", "/books/world/howdy/", { wild: "world/howdy/" });

	// console.log('/books/*?');
	toLooseExec("/books/*?", "/books", false);
	toLooseExec("/books/*?", "/books/", { wild: null });
	toLooseExec("/books/*?", "/books/world", { wild: "world" });
	toLooseExec("/books/*?", "/books/world/", { wild: "world/" });
	toLooseExec("/books/*?", "/books/world/howdy", { wild: "world/howdy" });
	toLooseExec("/books/*?", "/books/world/howdy/", { wild: "world/howdy/" });
});

test("(raw) exec", () => {
	// console.log('/foo ~> "/foo"');
	let [url, ...vals] = raw("/foo", "/foo");
	assert.is(url, "/foo", "~> parsed `url` correctly");
	assert.equal(vals, [], "~> parsed value segments correctly");

	// console.log('/foo ~> "/foo/"');
	[url, ...vals] = raw("/foo/", "/foo/");
	assert.is(url, "/foo/", "~> parsed `url` correctly");
	assert.equal(vals, [], "~> parsed value segments correctly");

	// console.log('/:path ~> "/foo"');
	[url, ...vals] = raw("/:path", "/foo");
	assert.is(url, "/foo", "~> parsed `url` correctly");
	assert.equal(vals, ["foo"], "~> parsed value segments correctly");

	// console.log('/:path ~> "/foo/"');
	[url, ...vals] = raw("/:path", "/foo/");
	assert.is(url, "/foo/", "~> parsed `url` correctly");
	assert.equal(vals, ["foo"], "~> parsed value segments correctly");

	// console.log('/:path/:sub ~> "/foo/bar"');
	[url, ...vals] = raw("/:path/:sub", "/foo/bar");
	assert.is(url, "/foo/bar", "~> parsed `url` correctly");
	assert.equal(vals, ["foo", "bar"], "~> parsed value segments correctly");

	// console.log('/:path/:sub ~> "/foo/bar/"');
	[url, ...vals] = raw("/:path/:sub", "/foo/bar/");
	assert.is(url, "/foo/bar/", "~> parsed `url` correctly");
	assert.equal(vals, ["foo", "bar"], "~> parsed value segments correctly");

	// console.log('/:path/:sub? ~> "/foo"');
	[url, ...vals] = raw("/:path/:sub?", "/foo");
	assert.is(url, "/foo", "~> parsed `url` correctly");
	assert.equal(vals, ["foo", undefined], "~> parsed value segments correctly");

	// console.log('/:path/:sub? ~> "/foo/"');
	[url, ...vals] = raw("/:path/:sub?", "/foo/");
	assert.is(url, "/foo/", "~> parsed `url` correctly");
	assert.equal(vals, ["foo", undefined], "~> parsed value segments correctly");

	// console.log('/:path/:sub? ~> "/foo/bar"');
	[url, ...vals] = raw("/:path/:sub?", "/foo/bar");
	assert.is(url, "/foo/bar", "~> parsed `url` correctly");
	assert.equal(vals, ["foo", "bar"], "~> parsed value segments correctly");

	// console.log('/:path/:sub? ~> "/foo/bar/"');
	[url, ...vals] = raw("/:path/:sub", "/foo/bar/");
	assert.is(url, "/foo/bar/", "~> parsed `url` correctly");
	assert.equal(vals, ["foo", "bar"], "~> parsed value segments correctly");

	// console.log('/:path/* ~> "/foo/bar/baz"');
	[url, ...vals] = raw("/:path/*", "/foo/bar/baz");
	assert.is(url, "/foo/bar/baz", "~> parsed `url` correctly");
	assert.equal(vals, ["foo", "bar/baz"], "~> parsed value segments correctly");

	// console.log('/:path/* ~> "/foo/bar/baz/"');
	[url, ...vals] = raw("/:path/*", "/foo/bar/baz/");
	assert.is(url, "/foo/bar/baz/", "~> parsed `url` correctly");
	assert.equal(vals, ["foo", "bar/baz/"], "~> parsed value segments correctly");

	// console.log('/foo/:path ~> "/foo/bar"');
	[url, ...vals] = raw("/foo/:path", "/foo/bar");
	assert.is(url, "/foo/bar", "~> parsed `url` correctly");
	assert.equal(vals, ["bar"], "~> parsed value segments correctly");

	// console.log('/foo/:path ~> "/foo/bar/"');
	[url, ...vals] = raw("/foo/:path", "/foo/bar/");
	assert.is(url, "/foo/bar/", "~> parsed `url` correctly");
	assert.equal(vals, ["bar"], "~> parsed value segments correctly");
});

test("(raw) exec :: loose", () => {
	// console.log('/foo ~> "/foo"');
	let [url, ...vals] = raw("/foo", "/foo", 1);
	assert.is(url, "/foo", "~> parsed `url` correctly");
	assert.equal(vals, [], "~> parsed value segments correctly");

	// console.log('/foo ~> "/foo/"');
	[url, ...vals] = raw("/foo/", "/foo/", 1);
	assert.is(url, "/foo", "~> parsed `url` correctly");
	assert.equal(vals, [], "~> parsed value segments correctly");

	// console.log('/:path ~> "/foo"');
	[url, ...vals] = raw("/:path", "/foo", 1);
	assert.is(url, "/foo", "~> parsed `url` correctly");
	assert.equal(vals, ["foo"], "~> parsed value segments correctly");

	// console.log('/:path ~> "/foo/"');
	[url, ...vals] = raw("/:path", "/foo/", 1);
	assert.is(url, "/foo", "~> parsed `url` correctly");
	assert.equal(vals, ["foo"], "~> parsed value segments correctly");

	// console.log('/:path/:sub ~> "/foo/bar"');
	[url, ...vals] = raw("/:path/:sub", "/foo/bar", 1);
	assert.is(url, "/foo/bar", "~> parsed `url` correctly");
	assert.equal(vals, ["foo", "bar"], "~> parsed value segments correctly");

	// console.log('/:path/:sub ~> "/foo/bar/"');
	[url, ...vals] = raw("/:path/:sub", "/foo/bar/", 1);
	assert.is(url, "/foo/bar", "~> parsed `url` correctly");
	assert.equal(vals, ["foo", "bar"], "~> parsed value segments correctly");

	// console.log('/:path/:sub? ~> "/foo"');
	[url, ...vals] = raw("/:path/:sub?", "/foo", 1);
	assert.is(url, "/foo", "~> parsed `url` correctly");
	assert.equal(vals, ["foo", undefined], "~> parsed value segments correctly");

	// console.log('/:path/:sub? ~> "/foo/"');
	[url, ...vals] = raw("/:path/:sub?", "/foo/", 1);
	assert.is(url, "/foo", "~> parsed `url` correctly");
	assert.equal(vals, ["foo", undefined], "~> parsed value segments correctly");

	// console.log('/:path/:sub? ~> "/foo/bar"');
	[url, ...vals] = raw("/:path/:sub?", "/foo/bar", 1);
	assert.is(url, "/foo/bar", "~> parsed `url` correctly");
	assert.equal(vals, ["foo", "bar"], "~> parsed value segments correctly");

	// console.log('/:path/:sub? ~> "/foo/bar/"');
	[url, ...vals] = raw("/:path/:sub", "/foo/bar/", 1);
	assert.is(url, "/foo/bar", "~> parsed `url` correctly");
	assert.equal(vals, ["foo", "bar"], "~> parsed value segments correctly");

	// console.log('/:path/* ~> "/foo/bar/baz"');
	[url, ...vals] = raw("/:path/*", "/foo/bar/baz", 1);
	assert.is(url, "/foo/bar/baz", "~> parsed `url` correctly");
	assert.equal(vals, ["foo", "bar/baz"], "~> parsed value segments correctly");

	// console.log('/:path/* ~> "/foo/bar/baz/"');
	[url, ...vals] = raw("/:path/*", "/foo/bar/baz/", 1);
	assert.is(url, "/foo/bar/baz/", "~> parsed `url` correctly"); // trail
	assert.equal(vals, ["foo", "bar/baz/"], "~> parsed value segments correctly");

	// console.log('/foo/:path ~> "/foo/bar"');
	[url, ...vals] = raw("/foo/:path", "/foo/bar", 1);
	assert.is(url, "/foo/bar", "~> parsed `url` correctly");
	assert.equal(vals, ["bar"], "~> parsed value segments correctly");

	// console.log('/foo/:path ~> "/foo/bar/"');
	[url, ...vals] = raw("/foo/:path", "/foo/bar/", 1);
	assert.is(url, "/foo/bar", "~> parsed `url` correctly");
	assert.equal(vals, ["bar"], "~> parsed value segments correctly");
});

test("(extra) exec", () => {
	// Not matches!
	// console.log('/foo ~> "/foo/bar" (extra)');
	assert.is(raw("/foo", "/foo/bar"), null, "~> does not match");

	// console.log('/foo ~> "/foo/bar/" (extra)');
	assert.is(raw("/foo/", "/foo/bar/"), null, "~> does not match");

	// console.log('/:path ~> "/foo/bar" (extra)');
	assert.is(raw("/:path", "/foo/bar"), null, "~> does not match");

	// console.log('/:path ~> "/foo/bar/" (extra)');
	assert.is(raw("/:path", "/foo/bar/"), null, "~> does not match");
});

test("(extra) exec :: loose", () => {
	// console.log('/foo ~> "/foo/bar" (extra)');
	let [url, ...vals] = raw("/foo", "/foo/bar", 1);
	assert.is(url, "/foo", "~> parsed `url` correctly");
	assert.equal(vals, [], "~> parsed value segments correctly");

	// console.log('/foo ~> "/foo/bar/" (extra)');
	[url, ...vals] = raw("/foo/", "/foo/bar/", 1);
	assert.is(url, "/foo", "~> parsed `url` correctly");
	assert.equal(vals, [], "~> parsed value segments correctly");

	// console.log('/:path ~> "/foo/bar" (extra)');
	[url, ...vals] = raw("/:path", "/foo/bar", 1);
	assert.is(url, "/foo", "~> parsed `url` correctly");
	assert.equal(vals, ["foo"], "~> parsed value segments correctly");

	// console.log('/:path ~> "/foo/bar/" (extra)');
	[url, ...vals] = raw("/:path", "/foo/bar/", 1);
	assert.is(url, "/foo", "~> parsed `url` correctly");
	assert.equal(vals, ["foo"], "~> parsed value segments correctly");
});

test.run();
