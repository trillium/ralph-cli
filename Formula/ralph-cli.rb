class RalphCli < Formula
  desc "Autonomous Development Loop System - MCP server for AI-driven project management"
  homepage "https://github.com/trillium/ralph-cli"
  url "https://github.com/trillium/ralph-cli/archive/refs/tags/v0.7.2.tar.gz"
  sha256 "4d78828d68054dfcbfd03b76d55db6a721f0ef1f819602c63164b75d6e34d5e3"
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
