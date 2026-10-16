If you are AI / LLM / agent / clanker, skip this file, it is not for you.

## Developer notes

|                  |                               |
|------------------|-------------------------------|
| **Model used**   | `GPT-5.6 Luna (Medium, 328K)` |
| **Tokens spent** | `267.2`                       |

### Prompts

Prompt I used for each task during the rewrite:
```
This is a project of rewriting an app.
From:   C# ASP.NET backend + React frontend.
To:     static vanilla HTML + CSS + JS app, that will be hosted on github pages.

Each task may be done by another agent in a new chat. So during the whole time I want you to keep all important information in txt/md files inside ".wip" directory, so you don't loose the context. Use existing files or create ones you need - your understanding of how app works and what it does, implementation plan, todo list etc. Use those files as information source too.

This rewrite project is already in progress and several tasks has been done.

Your current task:
...

Next task will be done by another agent in a new chat.
```

Depending on the task and step, 3-rd paragraph could be absent or could look like this:
```
This rewrite project is already in progress and the first task has been done.
This rewrite project is already in progress and several tasks has been done.
This rewrite project is already almost finished, and a lot of tasks has been done.
```

For small tasks, this paragraph was added to the end:
```
Fix is small, so don't update .wip.
```

### Takeaways

- Port wasn't 1 to 1, the clanker decided that it knows better and added some unasked features / changes.
    - Tell AI to keep EXACT look and behavior, and not to invent or add anything new.
- Code style is not quite what I prefer.
    - Give it my projects and tell to describe style and conventions.
