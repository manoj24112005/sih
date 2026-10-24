import os
import sys
import subprocess
import time
import webbrowser

def main():
    root_dir = os.path.dirname(os.path.abspath(__file__))
    venv_python = os.path.join(root_dir, "venv", "Scripts", "python.exe")
    if not os.path.exists(venv_python):
        venv_python = sys.executable

    print("=================================================================")
    print(" VeriCore — Institutional Compliance & Document Verification")
    print(" Smart India Hackathon Prototype (SIH26261)")
    print("=================================================================")
    print("[1/3] Initializing and seeding demo database...")
    subprocess.run([venv_python, os.path.join(root_dir, "backend", "seed_data.py")], check=True)

    print("[2/3] Starting Flask backend server on http://127.0.0.1:5000 ...")
    backend_proc = subprocess.Popen([venv_python, os.path.join(root_dir, "backend", "app.py")])

    print("[3/3] Starting Vite frontend server on http://localhost:5173 ...")
    frontend_proc = subprocess.Popen(["npm", "run", "dev"], cwd=os.path.join(root_dir, "frontend"), shell=True)

    time.sleep(3)
    print("\n=================================================================")
    print(" Platform is ready!")
    print(" URL: http://localhost:5173")
    print(" Backend API: http://127.0.0.1:5000/api/health")
    print(" Press Ctrl+C in this terminal to shut down both servers.")
    print("=================================================================\n")

    try:
        webbrowser.open("http://localhost:5173")
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nShutting down servers...")
        backend_proc.terminate()
        frontend_proc.terminate()
        print("Servers stopped cleanly.")

if __name__ == "__main__":
    main()
