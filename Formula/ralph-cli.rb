class RalphCli < Formula
  desc "Autonomous Development Loop System - MCP server for AI-driven project management"
  homepage "https://github.com/trillium/ralph-cli"
  url "https://github.com/trillium/ralph-cli/archive/refs/tags/v0.7.0.tar.gz"
  sha256 "af235b65b27a63282b810f6e449027260d00ebbe6b8a4ea76a8f1b6ba4d005a2"
  license "MIT"
  head "https://github.com/trillium/ralph-cli.git", branch: "main"

  depends_on "bun"

  def install
    # Install all files to libexec
    libexec.install Dir["*"]

    # Install dependencies using Bun
    cd libexec do
      system "bun", "install", "--production"
    end

    # Create executable wrapper for ralph-mcp
    (bin/"ralph-mcp").write_env_script libexec/"tools/mcp-server.ts", {}
  end

  test do
    # Test that the MCP server responds to initialization
    output = pipe_output("#{bin}/ralph-mcp", '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}')
    assert_match(/ralph_/, output)
  end
end
