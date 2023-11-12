async function importBookNotes() {
    if (document.querySelector('#ipInput').value === '') {
        alert('输入接受设备IP地址')
        return
    }
    const inputFiles = document.querySelector('#noteFile')
    const files = inputFiles.files
    if (files.length === 0) {
        alert("导入笔记文件")
        return
    }

    let message = ""
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const text = await readTxt(file);

        try {
            await translateNote(text)
            message += "✅" + file.name + "，导入成功\n"
        } catch (e) {
            message += "❌" + file.name + "，" + e + "\n"
        }
    }
    if (message === "") {
        alert("未导入任何内容")
    } else {
        alert(message)
    }
}

async function translateNote(text) {
    const body = createBody(text)
    const ipAddress = document.querySelector('#ipInput').value;
    return sendRequest(ipAddress, body)
}

function readTxt(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
            resolve(reader.result)
        }
        reader.readAsText(file)
    })
}

function createBody(text) {
    tmp = text.split('---');
    yaml = tmp[1];
    notes = tmp[2];

    const body = {
        // 默认电子书
        type: 1,
        // 页码类型默认位置
        locationUnit: 1
    }
    // 必填
    body.title = getTitle(yaml);

    // 选填
    body.cover = optionAttr('#myCover').trim();
    body.author = optionAttr('#myAuthor').trim();
    body.translator = optionAttr('#myTranslator').trim();
    body.publisher = optionAttr('#myPublisher').trim();
    body.publishDate = transTime(optionAttr('#myPublishDate'));
    body.isbn = optionAttr('#myISBN').trim();

    const items = notes.split(']]');
    const entries = [];
    if (items.length > 1) {
        for (let i = 0; i < items.length - 1; i++) {
            const aEntry = getNote(yaml, items[i]);
            if (aEntry != null) {
                entries.push(aEntry);
            }
        }
    }
    body.entries = entries;
    return body
}

function optionAttr(id) {
    try {
        let value = document.querySelector(id).value;
        return value;
    } catch (e) {
        return null;
    }

}

function getTitle(yaml) {
    const re = /source: (.*)/
    if (!re.test(yaml)) {
        throw "导入失败：未获取到书名"
    } else {
        return re.exec(yaml)[1]
    }
}

function getNoteTime(yaml) {
    const re = /created: (\d{4}-\d{1, 2}-\d{1, 2})/;
    if (!re.test(yaml)) {
        return null
    } else {
        return re.exec(yaml)[1]
    }
}

function transTime(time) {
    timestamp = new Date(time).getTime();
    return timestamp / 1000
}

function getNote(yaml, item) {
    // 笔记数组
    noteTime = transTime(getNoteTime(yaml));
    notePage = getNotePage(item);
    noteText = getNoteText(item);
    noteNote = null;
    noteChapter = null;

    let entry = {
        page: notePage,
        text: noteText,
        note: noteNote,
        chapter: noteChapter,
        time: noteTime
    }

    // console.log(entry);

    if (entry.text === "" && entry.note === "") {
        return null
    } else {
        return entry
    }
}

function getNotePage(item) {
    const re = /#page=(\d*)/;
    if (!re.test(item)) {
        return null
    } else {
        return re.exec(item)[1]
    }
}

function getNoteText(item) {
    try {
        text = item.split('\n> ')[1];
        return text
    } catch (e) {
        return ''
    }

}

function sendRequest(ipAddress, body) {
    return new Promise((resolve, reject) => {
        const req = new XMLHttpRequest();
        req.addEventListener('load', () => {
            if (req.status !== 200) {
                const result = JSON.parse(req.responseText)
                if (result.code === 200) {
                    resolve('导入成功')
                } else {
                    reject("导入失败：" + result.message)
                }
            } else {
                resolve(req.responseText)
            }
        })
        req.addEventListener('error', () => {
            reject("请求发送失败，状态码：" + req.status + "，原因：" + req.statusText)
        });
        req.open("POST", "http://" + ipAddress + ":8080/send", true);
        req.setRequestHeader("ContentType", "application/json");
        req.timeout = 20 * 1000;
        req.send(JSON.stringify(body));
    })
}