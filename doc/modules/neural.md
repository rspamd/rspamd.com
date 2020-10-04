---
layout: doc
title: Neural network module
---

# Neural network module

Neural network module is an experimental module that allows to perform post-classification of messages based on their current symbols and some training corpus obtained from the previous learns.

Prior Rspamd 1.7 up to version 2.0, you have to build Rspamd with `libfann` support to use this module. It is normally enabled if you use pre-built packages, however, it could be specified using `-DENABLE_FANN=ON` to `cmake` command during build process.

Since Rspamd 2.0, libfann module is removed in honor of [kann](https://github.com/attractivechaos/kann). This tool allows more powerful neural networks processing and it should be used for all new installations.

Neural network is learned for spam when a message is recognized as spam and it is learned as ham when a message is recognized as ham (there are several heursitics behind it, so it is not just a plain score in general). You could also use your own criteria for learning.

Training is performed in background and after some amount of trains neural network is updated and stored in Redis server allowing scanners to load and update their own data.

After some amount of training iterations (`10` by default), the training process removes old neural network and starts training a new one. This is done to ensure that old data does not influence the current processing. Once trained, neural network data is saved into Redis where all Rspamd scanners share their learning data. Redis is also used to store intermediate train vectors. ANN and training data is saved in Redis compressed using `zstd` compressor.

## Configuration

This module is explicitly **disabled** by default, so you need to enable it in local or override configuration.

Make sure at least one Redis server is [specified]({{ site.baseurl }}/doc/configuration/redis.html) in common `redis` section. Alternatively, you can define Redis server in the module configuration:
~~~ucl
# local.d/neural.conf
servers = "localhost";
enabled = true; # Important after 1.7
~~~

You also need to **define the scores** for symbols added by this module. By default, they are zero.

To do that, you should edit `local.d/neural_group.conf` file:

~~~ucl
# local.d/neural_group.conf

symbols = {
  "NEURAL_SPAM" {
    weight = 3.0; # sample weight
    description = "Neural network spam";
  }
  "NEURAL_HAM" {
    weight = -3.0; # sample weight
    description = "Neural network ham";
  }
}
~~~

### Configuration options

The neural networks module support different configuration options with regard to setting up different neural networks. From version 1.7, it supports multiple rules with both automatic and non-automatic neural networks. However, this configuration is usually to advanced for general usage.

By default, you can use the old configuration style, e.g.

~~~ucl
# local.d/neural.conf

servers = "127.0.0.1:6379";

train {
  max_trains = 1k; # Number ham/spam samples needed to start train
  max_usages = 20; # Number of learn iterations while ANN data is valid
  learning_rate = 0.01; # Rate of learning
  max_iterations = 25; # Maximum iterations of learning (better preciseness but also lower speed of learning)
}

ann_expire = 2d; # For how long ANN should be preserved in Redis
~~~

In this snippet, we define a simple network that automatically learns ham and spam on messages with corresponding actions. Upon creation, it is allowed to do additional trains for 20 more times. Rspamd trains a neural network when `(ham_samples + spam_samples) >= max_trains`. It also automatically maintains equal proportions of spam and ham samples to provide fair training. If you run somehow small email system, then you can increase `max_usages` to preserve trained networks for longer time (you might also adjust `ann_expire` accordingly).

Rspamd can use the same neural network from multiple processes that could run on multiple hosts across the network. It is guaranteed that processes with different configuration symbols enabled will use different neural networks (each network has a hash of all symbols defined as a suffix for Redis keys). Furthermore, there is a guarantee that all learning will be done in a single process that atomically updates neural network data after learning.

### Settings usage

Rspamd also automatically uses settings id to select different networks for different sets of [user settings](../configuration/settings.html). This is identified by settings id that is appended to neural network name. This feature can be useful, for example, when you want to split neural networks for inbound and outbound users identified by settings. 

### Multiple networks

From version 1.7, Rspamd supports multiple neural networks defined in the configuration. It could be useful for long/short neural networks setup where one network has a lot of `max_usages` and quite large `max_trains`, while short one reacts quickly to newly detected patterns. However, in practice, this setup is usually not really more effective so it is recommended just to use a single network.

~~~ucl
# local.d/neural.conf
rules {
  "LONG" {
    train {
      max_trains = 5000;
      max_usages = 200;
      max_iterations = 25;
      learning_rate = 0.01,
    }
    symbol_spam = "NEURAL_SPAM_LONG";
    symbol_ham = "NEURAL_HAM_LONG";
    ann_expire = 100d;
  }
  "SHORT" {
    train {
      max_trains = 100;
      max_usages = 2;
      max_iterations = 25;
      learning_rate = 0.01,
    }
    symbol_spam = "NEURAL_SPAM_SHORT";
    symbol_ham = "NEURAL_HAM_SHORT";
    ann_expire = 1d;
  }
}
~~~

~~~ucl
# local.d/neural_group.conf

symbols = {
  "NEURAL_SPAM_LONG" {
    weight = 3.0; # sample weight
    description = "Neural network spam (long)";
  }
  "NEURAL_HAM_LONG" {
    weight = -3.0; # sample weight
    description = "Neural network ham (long)";
  }
  "NEURAL_SPAM_SHORT" {
    weight = 2.0; # sample weight
    description = "Neural network spam (short)";
  }
  "NEURAL_HAM_SHORT" {
    weight = -1.0; # sample weight
    description = "Neural network ham (short)";
  }
}
~~~
