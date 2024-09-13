import websocket
import rel
import json
from datetime import datetime

# 用於保存消息的文件名
LOG_FILE = "websocket_messages.log"


def log_message(message):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with open(LOG_FILE, "a", encoding="utf-8") as file:
        file.write(f"[{timestamp}] {message}\n\n")


def extract_info(data):
    try:
        json_data = json.loads(data)
        if json_data.get("type") == "comments":
            for comment in json_data.get("data", {}).get("comments", []):
                user_data = comment.get("data", {})
                user_id = user_data.get("userId", "未知")
                speech_text = user_data.get("speechText", "未知")
                return f"用戶ID: {user_id}, 語音文本: {speech_text}"
    except json.JSONDecodeError:
        return "無法解析JSON數據"
    return None


def on_message(ws, message):
    info = extract_info(message)
    if info:
        print(info)
        log_message(info)
    else:
        print(f"收到非評論消息或無法提取信息")
        log_message(f"收到非評論消息或無法提取信息")


def on_error(ws, error):
    error_message = f"錯誤: {error}"
    print(error_message)
    log_message(error_message)


def on_close(ws, close_status_code, close_msg):
    close_message = "### 連接關閉 ###"
    print(close_message)
    log_message(close_message)


def on_open(ws):
    open_message = "連接已建立"
    print(open_message)
    log_message(open_message)


if __name__ == "__main__":
    websocket.enableTrace(True)
    ws = websocket.WebSocketApp("ws://127.0.0.1:11180/sub",
                                on_open=on_open,
                                on_message=on_message,
                                on_error=on_error,
                                on_close=on_close)

    ws.run_forever(dispatcher=rel)
    rel.signal(2, rel.abort)  # Keyboard Interrupt
    rel.dispatch()
