import React, { useState, useEffect, useMemo, useRef } from "react";
import logo from "./logo.svg";
import "./App.css";
import { View } from "react-native";
import { marked } from "marked";
import { v4 as uuidv4 } from "uuid";

let isLoading = false;
const backend = "http://localhost:8081";

function App() {
  const [formData, setFormData] = useState({
    name: "",
    value: "",
    location: new Blob(),
    topic: "",
  });
  const [topics, setTopics] = useState(Array<string>);
  const [topic, setTopic] = useState("");
  const [pullTopics, setPullTopics] = useState(true);
  const [filterBy, setFilterBy] = useState("");
  const [showTopics, setShowTopics] = useState(false);
  const [disableChat, setDisableChat] = useState(true);
  const [useRAG, setUseRAG] = useState(false);

  const apiCalls = async (params: { endpoint: string; options: any }) => {
    return await fetch(`${backend}${params.endpoint}`, params.options);
  };
  const useRagRef = useRef(null);

  const readyToUpload = useMemo(() => {
    return topic === "" || formData.value === "";
  }, [topic, formData]);

  const applySort = () => {
    return filterBy === ""
      ? topics
      : topics.filter((item) => {
          return item.toLowerCase().startsWith(filterBy.toLowerCase());
        });
  };

  const sendMessage = async (event: any) => {
    event.preventDefault();

    const chatWindow = document.querySelector(".chat-window");
    const chatText = document.querySelector<any>(".chat-input");
    const message = chatText.value;
    (document.activeElement as HTMLElement).blur();
    chatText.value = "";
    setDisableChat(true);

    const outgoingMessageLi = document.createElement("li");
    outgoingMessageLi.classList.add("chat-message", "li");
    const outgoingMessageElement = document.createElement("div");
    outgoingMessageElement.classList.add("chat-message", "outgoing");
    outgoingMessageElement.innerText = message;

    // Append the message to the chat window
    outgoingMessageLi.appendChild(outgoingMessageElement);
    chatWindow?.appendChild(outgoingMessageLi);
    // const useRAG = (useRagRef?.current as unknown as HTMLInputElement)?.checked;

    await apiCalls({
      endpoint: "/chat" + (useRAG ? "/askagent" : ""),
      options: {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ data: message }),
        redirect: "follow",
      },
    })
      .then((response) => response.text())
      .then((result) => {
        const message = JSON.parse(result).message;
        responseAI(message);
        if (chatWindow?.scrollTop) {
          chatWindow.scrollTop = chatWindow?.scrollHeight;
        }
      })
      .catch((error) => console.error(error));
  };

  useEffect(() => {
    apiCalls({
      endpoint: "/chat/topics",
      options: {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        redirect: "follow",
      },
    })
      .then((response) => response.text())
      .then((result) => {
        const receivedTopics: any = [];
        JSON.parse(result).forEach((item: string) => {
          receivedTopics.push(item);
        });
        setTopics(receivedTopics);
      })
      .catch((error) => console.error(error));
    setPullTopics(false);
  }, [pullTopics]);

  async function responseAI(message: string) {
    const chatWindow = document.querySelector(".chat-window");

    const incomingMessageLi = document.createElement("li");
    incomingMessageLi.classList.add("chat-message", "li");
    // Create a message element
    const incomingmessageElement = document.createElement("div");
    incomingmessageElement.classList.add("chat-message", "incoming");
    const markedUpText = await marked.parse(message);
    incomingmessageElement.innerHTML = markedUpText;

    incomingMessageLi.appendChild(incomingmessageElement);

    chatWindow?.appendChild(incomingMessageLi);
    if (chatWindow?.scrollTop) {
      chatWindow.scrollTop = chatWindow?.scrollHeight;
    }
    isLoading = false;
  }

  const handleChange = (event: any) => {
    const target = event.target;
    const { name, value, files } = target;

    setFormData({
      ...formData,
      name: name,
      value: value,
      location: files[0],
      topic: topic,
    });
  };

  // Upload the attached file
  const handleSubmit = async (event: any) => {
    event.preventDefault();

    const formdata_Upload = new FormData();
    formdata_Upload.append("file", formData.location, formData.value);
    formdata_Upload.append("topic", topic);

    await apiCalls({
      endpoint: "/chat/upload",
      options: {
        method: "POST",
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
        body: formdata_Upload,
        redirect: "follow",
      },
    })
      .then((response) => response.text())
      .then((result) => {
        // Successful
      })
      .catch((error) => console.error(error));
  };

  const pickAndSetTopic = (selectedTopic: string) => {
    setTopic(selectedTopic);
    // hide the list
    setShowTopics(false);
    const typeTopicElement: HTMLInputElement = document.getElementById(
      "topic-input"
    ) as HTMLInputElement;
    typeTopicElement.value = selectedTopic.toLowerCase();
  };
  function handleTextInput(event: any) {
    const val: string = event.target.value;
    setDisableChat(val.trim() === "");
  }
  function keyPressed() {}
  function loadList() {}
  function updateList(event: any) {
    const enteredValue = event.target.value;
    setFilterBy(enteredValue);
    setTopic(enteredValue);
    console.log(topic);
    setShowTopics(true);
  }

  const checkRagBtn = (event: any) => {
    setUseRAG(() => {
      return !useRAG;
    });
  };

  return (
    <View id={"App"}>
      <div className="chat-heading">Chat AI</div>
      <div>
        <ul className="chat-window"></ul>
      </div>
      <div id="upload-pane">
        <div id="upload-input-panel">
          <input
            id="file-upload"
            name="file"
            type="file"
            onChange={handleChange}
          />
          <div
            id="upload-btn"
            className={readyToUpload ? "disabled" : ""}
            onClick={handleSubmit}
          />
        </div>

        <div id="rag-panel">
          <div id="check-panel">
            <div
              id="use-rag-btn"
              className={useRAG ? "checked" : "unchecked"}
              onClick={checkRagBtn}
            />
            {/* <input
              type="checkbox"
              id="agent"
              name="agent"
              value="agent"
              ref={useRagRef}
            /> */}
            <label htmlFor="agent">Use Agent</label>
          </div>
          <div id="topics-panel">
            <input
              type="text"
              className="topic"
              id="topic-input"
              onClick={loadList}
              onChange={updateList}
              placeholder="Type topic"
            />
            {showTopics && (
              <div id="topics">
                {applySort().map((topic: string) => (
                  <div
                    onClick={() => pickAndSetTopic(topic)}
                    key={uuidv4()}
                    className="topic"
                  >
                    {topic.toLowerCase()}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div id="chat-form">
        <textarea
          id="chat-input"
          className="chat-input"
          placeholder="Enter your message..."
          onChange={handleTextInput}
          onKeyDown={keyPressed}
        >
          {" "}
        </textarea>
        <div
          id="send-btn"
          className={disableChat ? "disabled" : ""}
          onClick={sendMessage}
        />
      </div>
      {isLoading && <div id="status">Loading</div>}
    </View>
  );
}

export default App;
