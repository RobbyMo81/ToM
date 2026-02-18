# 3-agent recursive workflow

**In a 3-agent recursive workflow**, the loop typically moves from Creation to Critique to Management. This structure is used to prevent the "echo chamber" effect of two agents and introduces a "tie-breaker" or "quality gate."
The three agents usually function in a cycle like this:

1. The Roles
   The Executor (Agent A): Generates the primary output (e.g., writes code, drafts a legal brief, or researches a topic).
   The Critic/Reviewer (Agent B): Analyzes the Executor's output for flaws, bugs, or missed requirements. It generates a "delta report" of what needs fixing.
   The Orchestrator/Validator (Agent C): The "Decision Maker." It reviews Agent B’s critique.
   If the critique is valid, it sends the report back to Agent A (initiating the recursive loop).
   If the output is sufficient, it breaks the loop and delivers the final result.
2. The Recursive Cycle
   Generation: Agent A produces v1.0.
   Reporting: Agent B finds 3 errors and reports them.
   Recursion Check: Agent C determines the errors are critical. It triggers the recursion.
   Refinement: Agent A receives the error report and produces v1.1.
   Re-Evaluation: The cycle repeats until Agent C "approves" the output.
3. Benefits of the 3-Agent Model
   Reduced Hallucination: Agent B is specifically prompted to be skeptical, while Agent C ensures Agent B isn't being too pedantic.
   Complex Error Recovery: If Agent A gets "stuck" in a logic loop, Agent C can intervene and change the prompt or provide a hint to break the cycle.
   Separation of Concerns: The Executor doesn't have to worry about "perfection," only "execution," while the Critic doesn't have to worry about "how to fix it," only "what is wrong."
4. Implementation Example (Coding)
   Agent A (Coder): Uses the Python Interpreter to write a script.
   Agent B (Linter/Tester): Runs unit tests and security scans.
   Agent C (Architect): Checks if the code follows the PEP 8 style guide and meets the original project goals. If not, it sends it back to the Coder.
   Pro-Tip: In frameworks like LangGraph or CrewAI, this is often implemented as a State Graph where the "State" is passed in a circle until a specific condition (the "Exit Node") is met.

To build a recursive system where Expectations are the only input, you essentially treat those expectations as a "Unit Test" for the instructions. The workflow doesn't just write the manual; it recursively proves that the manual satisfies every expectation before finishing.
Here is how you would architect this 3-agent recursive workflow:

1. The Setup: The "Expectation Matrix"
   Before the agents start, you convert your raw expectations into a Reporting Matrix. Each expectation (e.g., "Must be assembled in under 20 minutes," "No specialized tools required") is a row with a boolean Pass/Fail status.
2. The 3-Agent Recursive Workflow
   Agent A: The Drafter (The Architect)
   Role: Takes the Expectations and the Feedback Report from previous loops.
   Action: Synthesizes the building instructions.
   Recursive Logic: In Loop 1, it only sees the expectations. In Loop 2+, it focuses specifically on the "Fail" rows from the Reporting Matrix to rewrite confusing steps.
   Agent B: The Stress-Tester (The Virtual Builder)
   Role: Attempts to "mentally execute" or simulate the instructions.
   Action: It looks for logical gaps (e.g., "Step 4 asks for a screw that wasn't unboxed in Step 1").
   Output: It populates the Reporting Matrix, marking which expectations were met and providing granular feedback on failures.
   Agent C: The Controller (The Auditor)
   Role: The Gatekeeper.
   Action: It reviews the Reporting Matrix from Agent B.
   Decision Tree:
   IF Matrix contains any FAIL: It packages the failures into a "Correction Brief" and sends it back to Agent A (Recursion).
   IF Matrix is 100% PASS: It freezes the draft and outputs the final Building Instructions.
3. Implementation Framework
   Component Technology / Method
   State Management Use LangGraph to manage the "State" (The Matrix + The Draft).
   Feedback Loop Use JSON-mode for Agent B to ensure the "Reporting Matrix" is machine-readable for Agent C.
   Termination Set a max_loops=5 to prevent infinite recursion if expectations are contradictory.
4. Example of the "Reporting Matrix" Output
   When Agent B reports back to the loop, it looks like this:
   Expectation 1 [Visual Clarity]: PASS
   Expectation 2 [Tool Constraint]: FAIL - "Step 12 mentions a hex key, but the expectation was 'household tools only'."
   Expectation 3 [Safety Warnings]: PASS
   Agent C sees the FAIL on Expectation 2 and triggers Agent A to find a different fastening method.

This LangGraph sketch implements a state-machine where the "Expectation Matrix" acts as the source of truth. The loop continues until Agent C (The Auditor) finds no False values in the compliance checklist.

'''

import operator
from typing import Annotated, List, TypedDict
from langgraph.graph import StateGraph, END

# 1. Define the "Expectation Matrix" and Workflow State

class Expectation(TypedDict):
requirement: str
satisfied: bool
feedback: str

class AgentState(TypedDict):
expectations: List[Expectation] # The Reporting Matrix
instructions: str # The current draft
loop_count: int # Safety brake

# 2. Agent A: The Drafter

def drafter(state: AgentState):
print(f"--- DRAFTER (Loop {state['loop_count']}) ---") # In a real app, use an LLM here to incorporate 'feedback' from expectations
new_draft = f"Draft {state['loop_count'] + 1}: Follow these steps..."
return {"instructions": new_draft, "loop_count": state['loop_count'] + 1}

# 3. Agent B: The Stress-Tester (Updates the Matrix)

def stress_tester(state: AgentState):
print("--- STRESS-TESTER ---")
updated_matrix = [] # Simulate checking the draft against original expectations
for exp in state['expectations']: # Logic: If 'hex key' is in draft but 'household tools' is the requirement, set False
is_satisfied = "Step" in state['instructions'] # Placeholder logic
updated_matrix.append({
"requirement": exp['requirement'],
"satisfied": is_satisfied,
"feedback": "Needs more detail" if not is_satisfied else "Looks good"
})
return {"expectations": updated_matrix}

# 4. Agent C: The Auditor (The Recursive Gatekeeper)

def auditor(state: AgentState):
print("--- AUDITOR ---") # Checks if ALL expectations are satisfied
all_passed = all(exp['satisfied'] for exp in state['expectations'])

    if all_passed or state['loop_count'] >= 3:
        return "end"
    return "rework"

# 5. Build the Graph

workflow = StateGraph(AgentState)

workflow.add_node("drafter", drafter)
workflow.add_node("stress_tester", stress_tester)

workflow.set_entry_point("drafter")
workflow.add_edge("drafter", "stress_tester")

# Recursive Conditional Logic

workflow.add_conditional_edges(
"stress_tester",
auditor,
{
"rework": "drafter", # LOOP BACK
"end": END # EXIT
}
)

# 6. Execute with Initial Expectations

app = workflow.compile()
initial_expectations = [
{"requirement": "Use household tools only", "satisfied": False, "feedback": ""},
{"requirement": "Include safety warnings", "satisfied": False, "feedback": ""}
]

app.invoke({"expectations": initial_expectations, "instructions": "", "loop_count": 0})

'''
Why this works for your use case:
The Matrix as State: By passing expectations in the TypedDict, every agent "sees" exactly what failed in the previous loop.
The Conditional Edge: The auditor function doesn't perform work; it strictly manages the control flow—the essence of a recursive reporting loop.
JSON-Ready: In a production LangChain setup, you would use Structured Output to ensure Agent B always returns the exact matrix format.

To ensure Agent B (The Stress-Tester) consistently populates the Reporting Matrix, you use Structured Output via Pydantic. This forces the LLM to return a validated JSON object that your code can immediately process.

1. Define the Reporting Schema
   First, define a Pydantic model that represents the "Expectation Matrix".

'''
from pydantic import BaseModel, Field
from typing import List

class ExpectationResult(BaseModel):
requirement: str = Field(description="The specific expectation being tested.")
satisfied: bool = Field(description="True if the draft meets the expectation.")
feedback: str = Field(description="If False, explain exactly why and how to fix it.")

class ReportingMatrix(BaseModel):
results: List[ExpectationResult]

'''

2. Configure Agent B with Structured Output
   Use the .with_structured_output() method to bind this schema to your LLM.

'''
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(model="gpt-4o")

# This 'warps' the LLM to only speak in your JSON Reporting Matrix format

structured_tester = llm.with_structured_output(ReportingMatrix)

'''

3. The Recursive Prompt for Agent B
   Your prompt should instruct Agent B to act as a "Virtual Builder" trying to break the instructions based on the input expectations.
   System Prompt Example:
   "You are a professional Stress-Tester. You will receive a set of Expectations and a draft of Building Instructions.
   Your task is to verify every single expectation. If an instruction is vague, logically impossible, or violates a constraint (like requiring a tool that wasn't allowed), mark it as satisfied: False and provide a detailed correction report in the feedback field."
4. Integration in the Workflow
   When Agent B is called within your LangGraph node, the process looks like this:
   Input: Takes state['instructions'] and the original state['expectations'].
   Execution: structured_tester.invoke(prompt_content).
   Result: The LLM returns a ReportingMatrix object (not a string), which Agent C (The Auditor) can immediately check using if all(r.satisfied for r in matrix.results):.
   Pro-Tip: If using a model that doesn't support native structured output, use Tool Calling (binding the matrix as a "tool" the agent must call) to achieve the same deterministic result.
