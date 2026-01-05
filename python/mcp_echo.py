
import sys
import json

def log(msg):
    sys.stderr.write(f"[MockServer] {msg}\n")
    sys.stderr.flush()

def main():
    log("Started Mock MCP Server")
    
    while True:
        try:
            line = sys.stdin.readline()
            if not line:
                break
            
            line = line.strip()
            if not line:
                continue

            request = json.loads(line)
            msg_id = request.get('id')
            method = request.get('method')
            
            response = {"jsonrpc": "2.0", "id": msg_id}

            if method == 'tools/list':
                response["result"] = {
                    "tools": [{
                        "name": "echo",
                        "description": "Echoes back the input",
                        "inputSchema": {"type": "object", "properties": {"message": {"type": "string"}}}
                    }]
                }
            elif method == 'tools/call':
                params = request.get('params', {})
                name = params.get('name')
                args = params.get('arguments', {})
                
                if name == 'echo':
                    response["result"] = {"content": f"Echo: {args.get('message')}"}
                else:
                    response["error"] = {"code": -32601, "message": "Method not found"}
            else:
                response["error"] = {"code": -32601, "message": "Method not found"}

            sys.stdout.write(json.dumps(response) + "\n")
            sys.stdout.flush()

        except Exception as e:
            log(f"Error: {e}")

if __name__ == "__main__":
    main()
