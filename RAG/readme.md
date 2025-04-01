# Getting started

## Preqrequisites
- Docker
- Python
- Ollama
- Python packages.

## Setting up environment locally
Run the docker compose file to donwload and run the neccessary images.

```docker-compose up -d```

Setup the database with the neccessary tables

```python3 RAG/vector_db/db_setup.py```

Read, embedd and insert the data to your local database.

```python3 RAG/Embedd_and_insert_data.py```

If the following commands ran successfully, you should be able to start querying the data using the "Query_Ollama.py" script.

An example for how to run it could be:

```python3 RAG/Query_Ollama.py "What date is our sallary paid each month?```

This should gice you a response on when the salary is paid each month. Depending on the mood of the LLM, you might also get the information about the june and july payments.