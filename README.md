The **ChatApp Project** is a multi-user web application that enables its users to create groups with the purpose of sending messages in the form of text and/or images.
Here are the main features of **ChatApp**:

* Groups can be either **private** (groups that will not be publicly visible or joinable by other users) or **public** (groups that can be searched by name and joined freely by users). 
* Users can add each-other as **friends**. A user has to be friends with another user to include them in a group.
* Whenever a new account is created, its user will receive an auto-generated e-mail in order to confirm the creation of their account and will be able to stay logged in with the use of their **bearer token**. 
* Data is stored in a **MongoDB** non-relational database and is transmitted between the backend and frontend of the application with the use of APIs.
* Each message holds essential information like the sender's username and the timestamp. 
* Images are encoded using **base64**.

***

This repository represents the **backend** part of **Chatapp** and was developed using **Express**. It is directly connected to MongoDB Cloud and implements the necessary APIs for data exchange with the frontend. There are five categories that the APIs can fall into: user, conversation, friend, image and message. Everything from saving an user account up to rendering the messages of a group is achieved with the use of APIs.
**Special thanks to https://github.com/AlexMihai1126 for API implementation**
