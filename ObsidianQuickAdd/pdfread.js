const quickaddApi = app.plugins.plugins.quickadd.api;
async function start(e, t) {
    // 获取当前正在看pdf文件数据结构
    const file = app.workspace.getActiveFile();
    // 获取文件名字
    const fileName = file.basename;
    // 设置基础文件夹
    const baseFolder = "书单/阅读批注";
    // 每本书对应的文件夹
    const notesFolderPath = baseFolder + "/" + fileName;

    // 不存在书对应文件夹时创建文件夹
    const hasFolder = await app.vault.adapter.exists(notesFolderPath);
    const note_base = notesFolderPath + "/00-" + fileName + '.md';
    if (!hasFolder) {
        await app.vault.createFolder(notesFolderPath);
        // 创建一个路径文件
        const base_yaml = `---\nUID: ${quickaddApi.date.now("YYYYMMDDHHmmss")}\nalias:\ntags: 读书笔记\nsource: ${file.basename}\ncssclass:\ncreated: ${quickaddApi.date.now("YYYY-MM-DD")}\n---\n`;
        await app.vault.create(note_base, base_yaml);
    }

    // 获取选中的文字
    let txt;
    if (document.selection) {
        //判断是否是ie浏览器
        txt = document.selection.createRange().text; //ie浏览器
    } else {
        txt = document.getSelection().toString(); //其他浏览器
    }
    // 文字处理
    let txts = txt.split("\n");
    txts = txts.join('');
    txts = '> ' + txts;

    // 获取当前页数
    const pageNumInput = document.querySelector(".pdf-page-input").value.trim();
    const pageNum = document
        .querySelector("span.pdf-page-numbers")
        .innerText.split("of")[0]
        .replace("(", "")
        .trim();

    const backlink =
        pageNum !== null && pageNum !== ""
            ? `> [[${fileName}.pdf#page=${pageNum}]]`
            : `> [[${fileName}.pdf#page=${pageNumInput}]]`;
    txt = txts + '\n' + backlink;

    // 文字再编辑
    let notes = await quickaddApi.wideInputPrompt(
        "阅读批注",
        "写下阅读中的思考",
        txt
    );
    if (!notes) return;
    let title = await quickaddApi.inputPrompt(
        "阅读批注标题为？",
        "默认为文件创建时间",
        quickaddApi.date.now("YYYY-MM-DD-HH-mm-ss") + " 阅读批注"
    );
    if (!title) return;
    // 将创建调整为追加模式
    let file_name = notesFolderPath + "/" + title + ".md";
    if (await app.vault.adapter.exists(file_name)) {
        let history = Object.assign(await app.vault.adapter.read(file_name));
        notes = '\n\n' + notes;
        history += notes;
        await app.vault.adapter.write(file_name, history);
        new Notice('阅读批注追加成功');
    } else {
        // 添加YAML
        let full_note = `---\nUID: ${quickaddApi.date.now("YYYYMMDDHHmmss")}\nalias:\ntags: 读书笔记\nsource: ${file.basename}\ncssclass:\ncreated: ${quickaddApi.date.now("YYYY-MM-DD")}\n---\n` + notes;
        await app.vault.create(file_name, full_note);
        // 更新note_base
        let base_history = Object.assign(await app.vault.adapter.read(note_base));
        base_history += `\n[[${file_name}|${title}]]`;
        await app.vault.adapter.write(note_base, base_history);
        new Notice("阅读批注创建成功");
    };
}
module.exports = {
    entry: start,
    settings: {
        name: "readnotes",
        author: "ZhiJiu (Ling也修改了一点点)",
        options: {},
    },
};