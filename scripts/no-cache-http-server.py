#!/usr/bin/env python3
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class NoCacheHTTPRequestHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


def main():
    parser = argparse.ArgumentParser(description="Serve static frontend files with no browser caching.")
    parser.add_argument("port", nargs="?", type=int, default=8000)
    parser.add_argument("--bind", default="", help="Bind address. Defaults to all interfaces.")
    parser.add_argument("--directory", default=".", help="Directory to serve.")
    args = parser.parse_args()

    handler = partial(NoCacheHTTPRequestHandler, directory=args.directory)
    with ThreadingHTTPServer((args.bind, args.port), handler) as httpd:
        print(f"Serving {args.directory} on {args.bind or '0.0.0.0'}:{args.port} with no-cache headers", flush=True)
        httpd.serve_forever()


if __name__ == "__main__":
    main()
