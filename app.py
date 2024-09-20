import http.server
import socketserver
import webbrowser
import os

PORT = 8000


def run_server():
    Handler = http.server.SimpleHTTPRequestHandler
    Handler.extensions_map.update({
        '.js': 'application/javascript',
    })

    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"服务器运行在 http://localhost:{PORT}")
        webbrowser.open(f"http://localhost:{PORT}")
        httpd.serve_forever()


if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    run_server()
