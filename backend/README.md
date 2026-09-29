# No Idea Backend

This repository holds the backend for the No Idea platform.

## Building from source

### Pre-requisites

Prior to running the program, you must ensure you complete the following steps:
1. Create a copy of `./config.toml.example` and call it `config.toml` in the same directory
2. Ensure you set the API key in the `config.toml` to a suitable value. [Generate a random API key](https://generate-random.org/api-keys).
3. (Optional) Set the `NO_IDEA_BE_CONFIG` environment variable to point to the `config.toml` file
4. (Optional) Create a python `.venv` folder by running the command `python -m venv .venv` from the root directory.
5. Install all packages listed in `./requirements.txt` into your python installation

### Running the program

Once all pre-requisites are satisfied, you can run the program using the command: `python -m src`. This will set up the FastAPI server which you can then query via the frontend website or using your preferred application (e.g. [Postman](https://www.postman.com/downloads/))

When sending requests to the FastAPI server, ensure you have a valid API key for any protected actions equivalent to the one defined in the config file. This should be added to the headers of any requests as `x-api-key`. In Postman, this can be done in the Authorisation tab with `x-api-key` as the key and the API key as the value.