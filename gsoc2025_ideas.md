---
layout: default
title: Rspamd project ideas for GSOC 2025
---

# Rspamd project ideas for GSOC 2025

## Introduction

This page lists project ideas for contributors to Rspamd, particularly for programs like Google Summer of Code (GSoC). We welcome contributors who are passionate about open-source development, email/spam filtering, and modern technologies like AI and Rust.

## Information for GSoC Participants

Prospective contributors should:
- Have a **GitHub account** and familiarity with Git workflows.
- Review the [Rspamd repository](https://github.com/rspamd/rspamd).
- Join our Telegram channel (`rspamd`) for discussions.
- Demonstrate proficiency in **C** (or C++), **Lua** or **Rust** (depending on the project).

All code must be licensed under **Apache 2.0**.

## Mentors

| Mentor | Email | Role |
|:-|:-|:-|
| Vsevolod Stakhov | vsevolod@rspamd.com | Core Development, Admin |
| Andrew Lewis | alewis@rspamd.com | Core Development, Lua plugins development |
| Anton Yuzhaninov | citrin@rspamd.com | Protocols, Integrations |

---

## List of Projects

### Multi-Class Bayesian Classifier
**Description**: Extend Rspamd’s Bayesian classifier to support **multiple categories** (beyond spam/ham) and integrate AI-driven learning via a **GPT plugin** for dynamic model updates.  

**Difficulty**: Medium/Hard  

**Timeline**: 22 weeks

**Skills**: Machine Learning (Bayesian methods), Lua, Python (for GPT integration)

**Mentors**: Vsevolod Stakhov, Andrew Lewis

**Benefits**: Gain expertise in AI/ML integration, probabilistic classifiers, and large-language model APIs.  
**Evaluation**:  
- **Midterm**: Basic multi-class support in Bayes module; GPT plugin prototype.  
- **Final**: Full integration with GPT for automated learning; performance benchmarks.  

---

### Full Telegram Support (Bot for Spam Filtering)
**Description**: Implement integration of with **Telegram bot** for spam filtering, including rule-based automation (e.g., user reports, admin moderation).  

**Difficulty**: Medium  

**Timeline**: 12 weeks

**Skills**: Rust (Telegram Bot API), Lua, Rule Engine Design  

**Mentors**: Andrew Lewis, Anton Yuzhaninov

**Benefits**: Learn real-time bot development, protocol integration, and spam rule optimization.  
**Evaluation**:  
- **Midterm**: Functional Telegram bot with basic spam reporting.  
- **Final**: Advanced rules (e.g., rate limiting, user reputation), moderation UI, and documentation.  

---

### Settings Manager (UI + Rust Backend)
**Description**: Build a **user-friendly UI** for managing Rspamd settings and a Rust-based backend for storing configurations in MySQL/PostgreSQL.  

**Difficulty**: Medium  

**Timeline**: 12 weeks

**Skills**: Rust, JavaScript/TypeScript (React/Vue), SQL  

**Mentors**: Andrew Lewis, Vsevolod Stakhov

**Benefits**: Master full-stack development, Rust database integration, and secure UI design.  
**Evaluation**:  
- **Midterm**: Rust backend with CRUD operations; UI prototype.  
- **Final**: Full UI feature set (import/export, versioning), performance optimizations.  

---

### GnuPG Signing and Verification Support
**Description**: Enhance Rspamd’s GnuPG support for signing/verifying emails, including key management and policy enforcement.  

**Difficulty**: Hard  

**Skills**: C, Cryptography (PGP/GnuPG), Lua  

**Timeline**: 22 weeks

**Mentors**: Vsevolod Stakhov

**Benefits**: Deepen knowledge of cryptographic protocols and secure C programming.  
**Evaluation**:  
- **Midterm**: Basic message signing/verification workflow.  
- **Final**: Key rotation policies, WebUI integration, and attack-resistance testing.  

---

## How to Proceed
1. **Fork the Rspamd repo** and explore the codebase.  
2. **Discuss your proposal** with mentors on Telegram or the mailing list.  
3. Submit a **detailed timeline** with milestones matching GSoC’s 12-week schedule.  

*We value passion, clarity, and realistic planning!*  
