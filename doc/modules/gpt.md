---
layout: doc
title: GPT Plugin
---
# Rspamd GPT Plugin

The Rspamd GPT Plugin, introduced in Rspamd 3.9, integrates OpenAI's GPT API to enhance spam filtering capabilities using advanced natural language processing techniques. Here are the basic ideas behind this plugin:

* The selected displayed text part is extracted and submitted to the GPT API for spam probability assessment
* Additional message details such as Subject, displayed From, and URLs are also included in the assessment
* Then, we ask GPT to provide results in JSON format since human-readable GPT output cannot be parsed (in general)
* Some specific symbols (`BAYES_SPAM`, `FUZZY_DENIED`, `REPLY`, etc.) are excluded from the GPT scan
* Obvious spam and ham are also excluded from the GPT evaluation

The last two points reduce the GPT workload for something that is already known, where GPT cannot add any value in the evaluation. We also use GPT as one of the classifiers, meaning that we do not rely solely on GPT evaluation.

For detailed information about this plugin, refer to the [blog post]({{ site.baseurl }}/misc/2024/07/03/gpt.html).

## Configuration Options

**By default, the GPT Plugin is disabled.** To enable the plugin, add the following command in your Rspamd configuration:

```hcl
gpt {
  enabled = true; # Ensure this line is present to enable the GPT Plugin
}
```

The full list of the plugin configuration options:

```hcl
gpt {
  # Enable the plugin
  enabled = true;

  # Supported type: openai
  type = "openai";
  
  # Your OpenAI API key
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
  
  # Custom condition (Lua function)
  condition = "xxx";
  
  # Autolearn if GPT classified
  autolearn = true;
  
  # Reply conversion (Lua code)
  reply_conversion = "xxx";
  
  # URL for the OpenAI API
  url = "https://api.openai.com/v1/chat/completions";
}
```

### Description of Configuration Options

- **enabled**: A boolean value that specifies whether the GPT Plugin is enabled. Set to `true` to activate the plugin.

- **type**: Specifies the GPT model type. Currently, only "openai" is supported.
  
- **api_key**: Your API key for accessing OpenAI services. Replace "xxx" with your actual API key.

- **model**: Specifies the GPT model to use, such as "gpt-3.5-turbo".

- **max_tokens**: Sets the maximum number of tokens to generate in the GPT response, controlling the length of the generated text.

- **temperature**: Controls the creativity of the generated text during sampling. Values range from 0 to 1, with higher values resulting in more creative outputs (default: 0.7).

- **top_p**: Sets the cumulative probability threshold for token selection using nucleus sampling (default: 0.9).

- **timeout**: Specifies the maximum wait time for API responses in seconds (e.g., 10s).

- **prompt**: Optional initial text prompt guiding model generation. If not set, a default prompt is used.

- **condition**: Custom Lua function defining conditions for plugin usage.

- **autolearn**: Enables automatic learning based on GPT classifications when set to true.

- **reply_conversion**: Custom Lua code converting the model's reply into a specific format or handling it in a certain way (default: JSON output of the GPT model).

- **url**: Endpoint for the OpenAI API (default: "https://api.openai.com/v1/chat/completions").

## Example Configuration

Here is an example configuration with the fields filled in:

```hcl
gpt {
  enabled = true; # Enable the plugin
  type = "openai";
  api_key = "your_api_key_here";
  model = "gpt-3.5-turbo";
  max_tokens = 500;
  temperature = 0.6;
  top_p = 0.8;
  timeout = 15s;
}
```

## Conclusion

The Rspamd GPT Plugin integrates OpenAI's GPT models into Rspamd, enhancing its spam filtering capabilities with advanced text processing techniques. By configuring the options above, users can customize the plugin to meet specific requirements, thereby enhancing the efficiency and accuracy of spam filtering within Rspamd.
