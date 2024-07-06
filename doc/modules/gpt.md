# Rspamd GPT Plugin

In Rspamd 3.9, ther is a new plugin to use OpenAI GPT API for spam filtering. Here are some basic ideas behind this plugin:

* The selected displayed text part is extracted and submitted to the GPT API for spam probability assessment
* Additional message details such as Subject, Display From, and URLs are also included in the assessment
* Then we ask GPT to provide results in JSON format since human-readable GPT output cannot be parsed (in general)
* Some specific symbols (`BAYES_SPAM`, `FUZZY_DENIED`, `REPLY`, etc.) are excluded from the GPT scan
* Obvious spam and ham are also excluded from the GPT evaluation

The former two points reduce the GPT workload for something that is already known, where GPT cannot add any value in the evaluation. We also use GPT as one of the classifiers, meaning that we do not rely solely on GPT evaluation.

You can read more about this plugin in this [document](https://rspamd.com/misc/2024/07/03/gpt.html).

## Configuration Options

```ini
gpt {
  # Supported types: openai
  type = "openai";
  
  # Your key to access the API
  api_key = "xxx";
  
  # Model name
  model = "gpt-3.5-turbo";
  
  # Maximum tokens to generate
  max_tokens = 1000;
  
  # Temperature for sampling
  temperature = 0.7;
  
  # Top p for sampling
  top_p = 0.9;
  
  # Timeout for requests
  timeout = 10s;
  
  # Prompt for the model (use default if not set)
  prompt = "xxx";
  
  # Custom condition (lua function)
  condition = "xxx";
  
  # Autolearn if gpt classified
  autolearn = true;
  
  # Reply conversion (lua code)
  reply_conversion = "xxx";
  
  # URL for the API
  url = "https://api.openai.com/v1/chat/completions";
}
```

### Description of Configuration Options

- **type**: Specifies the type of GPT model to use. Currently, only "openai" is supported.
  
- **api_key**: The API key required to access the OpenAI services. Replace "xxx" with your actual API key.

- **model**: Defines the model name to be used. For example, "gpt-3.5-turbo".

- **max_tokens**: The maximum number of tokens to generate in the response. This controls the length of the generated text.

- **temperature**: A sampling parameter that controls the creativity of the generated text. Values range from 0 to 1, with higher values resulting in more creative outputs. The default is 0.7.

- **top_p**: Another sampling parameter known as nucleus sampling. It determines the cumulative probability for token selection. The default value is 0.9.

- **timeout**: Sets the maximum time to wait for a response from the API. Specified in seconds (e.g., 10s).

- **prompt**: The initial text prompt to guide the model's generation. If not set, a default prompt will be used.

- **condition**: A custom Lua function to define specific conditions for using the plugin.

- **autolearn**: When set to true, the plugin will automatically learn and adjust based on the model's classifications.

- **reply_conversion**: Custom Lua code to convert the model's reply into a specific format or handle it in a certain way. The default one implies JSON output of the GPT model.

- **url**: The endpoint for the OpenAI API. The default is "https://api.openai.com/v1/chat/completions".

## Example Configuration

Here is an example configuration with the fields filled in:

~~~ucl
gpt {
  type = "openai";
  api_key = "your_api_key_here";
  model = "gpt-3.5-turbo";
  max_tokens = 500;
  temperature = 0.6;
  top_p = 0.8;
  timeout = 15s;
}
~~~

## Conclusion

The Rspamd GPT Plugin provides powerful text processing capabilities using OpenAI's GPT models. By configuring the options above, users can tailor the plugin to meet specific needs and enhance their email processing workflows.